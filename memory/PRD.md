# Scriptify - AI Video Generation Web App

## Original Problem Statement
Build an AI Video Generation Web App that converts user-provided scripts into coherent short videos using generative AI models. The pipeline includes:
1. Script input & scene decomposition
2. Character consistency engine
3. HD image generation per scene with user approval
4. Video generation per scene with user approval
5. Final video assembly from approved clips

## User Choices
- **Authentication**: Emergent-managed Google OAuth
- **Image Generation**: User-provided Gemini API key with Nano Banana model
- **Video Generation**: Veo 3.1 (simulated - requires Google AI Studio Pro)
- **Theme**: Light theme (clean/minimal)

## Architecture

### Backend (FastAPI + MongoDB)
- **Auth**: Emergent OAuth with session-based authentication
- **User Management**: MongoDB with custom user_id field
- **Project Management**: CRUD operations for projects
- **Scene Decomposition**: Gemini AI for script analysis
- **Image Generation**: Gemini Nano Banana (emergentintegrations)
- **Video Generation**: Veo 3.1 placeholder (simulated)
- **Approval System**: Bulk approve/reject for images and videos

### Frontend (React + Tailwind + shadcn/ui)
- **Landing Page**: Hero section, features, 5-step process
- **Dashboard**: Project list, API key warning
- **API Key Setup**: Gemini key validation and model selection
- **Project Editor**: Script input with auto-save
- **Scene Manager**: 7-step workflow with approval gates

## User Personas
1. **Content Creators**: Want to turn scripts into videos quickly
2. **Video Marketers**: Need consistent character visuals
3. **Indie Filmmakers**: Preview scenes before production
4. **Social Media Managers**: Create short-form video content

## Core Requirements (Static)
- [x] Script input and storage
- [x] AI-powered scene decomposition
- [x] Character extraction and consistency
- [x] HD image generation (1080p)
- [x] User approval for images before video generation
- [x] Video clip generation (10 seconds per scene)
- [x] User approval for videos before final assembly
- [x] Final video compilation from approved clips
- [x] Google OAuth authentication
- [x] User-provided Gemini API key management

## What's Been Implemented (Jan 2026)

### Phase 1 - MVP (Completed)
- [x] Landing page with hero, features, CTA
- [x] Google OAuth (Emergent-managed)
- [x] Dashboard with project management
- [x] API Key setup and validation
- [x] Project editor with script input
- [x] Scene decomposition with Gemini AI
- [x] Character extraction and profiles
- [x] HD image generation per scene
- [x] **Image approval workflow** (select, approve/reject)
- [x] Video generation from approved images only
- [x] **Video approval workflow** (select, approve/reject)
- [x] Final video assembly from approved clips
- [x] 7-step progress indicator
- [x] Responsive design

### Backend Endpoints
- `POST /api/auth/session` - OAuth session exchange
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `POST /api/settings/api-key` - Save Gemini API key
- `GET /api/settings/api-key/status` - Check key status
- `GET /api/settings/models` - List available models
- `GET/POST /api/projects` - List/Create projects
- `GET/PUT/DELETE /api/projects/{id}` - Project CRUD
- `POST /api/projects/{id}/decompose` - Scene decomposition
- `GET /api/projects/{id}/scenes` - List scenes
- `POST /api/projects/{id}/scenes/approve` - Bulk approve
- `POST /api/projects/{id}/scenes/{id}/generate-image` - Generate image
- `POST /api/projects/{id}/generate-all-images` - Generate all images
- `POST /api/projects/{id}/scenes/{id}/generate-video` - Generate video
- `POST /api/projects/{id}/generate-all-videos` - Generate approved videos
- `POST /api/projects/{id}/assemble` - Assemble final video

## Prioritized Backlog

### P0 - Critical (Completed)
- [x] Core video generation workflow
- [x] User authentication
- [x] Approval system

### P1 - High Priority
- [ ] Actual video file storage and download
- [ ] Real Veo 3.1 integration (requires Pro account)
- [ ] Video preview player
- [ ] Scene reordering

### P2 - Medium Priority
- [ ] FFmpeg integration for real video assembly
- [ ] Audio/voiceover support
- [ ] Custom transitions between clips
- [ ] Project sharing/collaboration

### P3 - Nice to Have
- [ ] Template scripts library
- [ ] Style presets
- [ ] Export quality options
- [ ] Social media format presets

## Next Tasks List
1. Integrate real video storage and download functionality
2. Add video preview player for generated clips
3. Implement scene drag-and-drop reordering
4. Add voiceover/audio track support
5. Implement custom transition effects

## Technical Notes
- Video generation is **SIMULATED** (placeholder) - requires Google AI Studio Pro access for Veo 3.1
- Final video assembly is **SIMULATED** - would need FFmpeg for real implementation
- Images are stored as base64 in MongoDB (consider cloud storage for production)
