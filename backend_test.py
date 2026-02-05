#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime, timezone, timedelta
import uuid
import subprocess

class ScriptifyAPITester:
    def __init__(self, base_url="https://scriptify-48.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session_token = None
        self.user_id = None
        self.project_id = None
        self.scene_ids = []
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                self.log(f"Response: {response.text[:200]}", "ERROR")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}", "ERROR")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def setup_test_user(self):
        """Create test user and session in MongoDB"""
        self.log("Setting up test user...")
        
        # Generate test data
        timestamp = int(time.time())
        self.user_id = f"test_user_{timestamp}"
        self.session_token = f"test_session_{timestamp}"
        
        # Create user and session directly in MongoDB
        try:
            mongo_script = f"""
            use('test_database');
            db.users.insertOne({{
                user_id: '{self.user_id}',
                email: 'test.user.{timestamp}@example.com',
                name: 'Test User {timestamp}',
                picture: 'https://via.placeholder.com/150',
                gemini_api_key: 'test_api_key_for_testing',
                selected_model: 'gemini-3-pro-image-preview',
                created_at: new Date()
            }});
            db.user_sessions.insertOne({{
                user_id: '{self.user_id}',
                session_token: '{self.session_token}',
                expires_at: new Date(Date.now() + 7*24*60*60*1000),
                created_at: new Date()
            }});
            """
            
            result = subprocess.run(['mongosh', '--eval', mongo_script], 
                                  capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                self.log(f"✅ Test user created: {self.user_id}")
                self.log(f"✅ Session token: {self.session_token}")
                return True
            else:
                self.log(f"❌ Failed to create test user: {result.stderr}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error setting up test user: {e}", "ERROR")
            return False

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_auth_without_session(self):
        """Test auth endpoint without session"""
        return self.run_test("Auth without session", "GET", "auth/me", 401)

    def test_api_key_status_without_auth(self):
        """Test API key status without auth"""
        return self.run_test("API key status without auth", "GET", "settings/api-key/status", 401)

    def test_projects_without_auth(self):
        """Test projects endpoint without auth"""
        return self.run_test("Projects without auth", "GET", "projects", 401)

    def test_invalid_project_access(self):
        """Test accessing non-existent project"""
        return self.run_test("Invalid project access", "GET", "projects/invalid_id", 401)

    def test_models_without_api_key(self):
        """Test models endpoint without API key (should fail auth first)"""
        return self.run_test("Models without auth", "GET", "settings/models", 401)

    def test_create_project_without_auth(self):
        """Test creating project without auth"""
        project_data = {"title": "Test Project"}
        return self.run_test("Create project without auth", "POST", "projects", 401, project_data)

    def test_scene_decomposition_without_auth(self):
        """Test scene decomposition without auth"""
        return self.run_test("Scene decomposition without auth", "POST", "projects/test/decompose", 401)

    def test_image_generation_without_auth(self):
        """Test image generation without auth"""
        return self.run_test("Image generation without auth", "POST", "projects/test/scenes/test/generate-image", 401)

    def test_video_generation_without_auth(self):
        """Test video generation without auth"""
        return self.run_test("Video generation without auth", "POST", "projects/test/scenes/test/generate-video", 401)

    def test_final_assembly_without_auth(self):
        """Test final video assembly without auth"""
        return self.run_test("Final assembly without auth", "POST", "projects/test/assemble", 401)

    def test_logout_without_session(self):
        """Test logout without session"""
        return self.run_test("Logout without session", "POST", "auth/logout", 200)

    def run_unauthenticated_tests(self):
        """Run all tests that should work without authentication"""
        self.log("=== Running Unauthenticated API Tests ===")
        
        tests = [
            self.test_root_endpoint,
            self.test_auth_without_session,
            self.test_api_key_status_without_auth,
            self.test_projects_without_auth,
            self.test_invalid_project_access,
            self.test_models_without_api_key,
            self.test_create_project_without_auth,
            self.test_scene_decomposition_without_auth,
            self.test_image_generation_without_auth,
            self.test_video_generation_without_auth,
            self.test_final_assembly_without_auth,
            self.test_logout_without_session
        ]
        
        for test in tests:
            test()
            time.sleep(0.5)  # Small delay between tests

    def test_cors_headers(self):
        """Test CORS headers"""
        self.log("Testing CORS headers...")
        try:
            response = requests.options(f"{self.base_url}/", timeout=10)
            headers = response.headers
            
            cors_headers = [
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods',
                'Access-Control-Allow-Headers'
            ]
            
            missing_headers = []
            for header in cors_headers:
                if header not in headers:
                    missing_headers.append(header)
            
            if missing_headers:
                self.log(f"❌ Missing CORS headers: {missing_headers}", "FAIL")
                return False
            else:
                self.log("✅ CORS headers present", "PASS")
                return True
                
        except Exception as e:
            self.log(f"❌ CORS test error: {e}", "ERROR")
            return False

    def test_api_health(self):
        """Test basic API health"""
        self.log("Testing API health...")
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            if response.status_code == 200:
                self.log("✅ API is responding", "PASS")
                return True
            else:
                self.log(f"❌ API health check failed: {response.status_code}", "FAIL")
                return False
        except Exception as e:
            self.log(f"❌ API health check error: {e}", "ERROR")
            return False

    def print_summary(self):
        """Print test summary"""
        self.log("=== TEST SUMMARY ===")
        self.log(f"Tests run: {self.tests_run}")
        self.log(f"Tests passed: {self.tests_passed}")
        self.log(f"Tests failed: {self.tests_run - self.tests_passed}")
        self.log(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "No tests run")
        
        if self.failed_tests:
            self.log("=== FAILED TESTS ===")
            for failure in self.failed_tests:
                self.log(f"❌ {failure.get('test', 'Unknown')}: {failure}", "FAIL")

def main():
    """Main test execution"""
    print("🚀 Starting Scriptify API Tests")
    print("=" * 50)
    
    tester = ScriptifyAPITester()
    
    # Test basic connectivity
    if not tester.test_api_health():
        print("❌ API is not accessible. Stopping tests.")
        return 1
    
    # Test CORS
    tester.test_cors_headers()
    
    # Setup test user
    tester.setup_test_user()
    
    # Run unauthenticated tests
    tester.run_unauthenticated_tests()
    
    # Print summary
    tester.print_summary()
    
    # Return appropriate exit code
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())