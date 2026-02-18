# Testing Guide

## Prerequisites

1. **Backend API must be running**
   ```bash
   cd /Users/adeildoneto/Coding/treinoway-service
   npm run dev
   ```
   The backend should be running on `http://localhost:3000`

2. **Database must be running**
   ```bash
   cd /Users/adeildoneto/Coding/treinoway-service
   npm run db:start
   ```

## Running the Test App

```bash
cd /Users/adeildoneto/Coding/treinoway-web
npm run dev
```

The app will be available at `http://localhost:5173` (or the next available port)

## Testing Flow

### 1. Authentication Flow

1. **Sign Up**
   - Navigate to the signup page
   - Create a new account with email and password
   - You'll be automatically logged in and redirected to the dashboard

2. **Log Out and Log In**
   - Click the logout button in the sidebar
   - Log back in with your credentials
   - Verify that the token refresh works by waiting 15+ minutes and making a request

### 2. Profile Management

1. **Update Profile**
   - Go to "My Profile"
   - Update your name and phone number
   - Save changes

2. **Change Password**
   - In the profile page, click "Change Password"
   - Enter current and new password
   - Verify you can log in with the new password

3. **Become a Trainer**
   - In the profile page, click "Become a Trainer"
   - Verify that the TRAINER role is added
   - Notice the sidebar now shows trainer-specific menu items

### 3. Trainer Features (requires TRAINER role)

#### Trainer Profile
1. Go to "Trainer Profile"
2. Fill in bio, service mode, and social media links
3. Save changes

#### Protocol Templates
1. Go to "Protocol Templates"
2. Create a new template:
   - Name: "8-Week Strength Program"
   - Description: "Build muscle and strength"
   - Duration: 8 weeks
3. Edit the template
4. Delete it or keep it for later use

#### Training Templates
1. Go to "Training Templates"
2. Create a new training template:
   - Name: "Upper Body Push"
   - Description: "Chest, shoulders, triceps"
   - Make it public (optional)
3. Create more templates for testing

#### Training Protocols
1. Go to "Training Protocols"
2. Create a new protocol:
   - Enter the email of a user (create a second user account if needed)
   - Optionally import from a protocol template
   - Set start and end dates
3. Click on the protocol to view details

#### Protocol Detail & Trainings
1. In a protocol detail page:
   - Add a new training (optionally import from template)
   - Give it a name, description, and order
   - Click "Schedule" to add it to specific weekdays and week numbers
2. Add multiple trainings to the protocol
3. Edit and delete trainings
4. Manage schedules

### 4. Student Features

1. Log in with a user account that has been assigned a protocol
2. Go to "My Protocols"
3. View all protocols assigned to you
4. Click on a protocol to see details:
   - Trainer information
   - All trainings in the protocol
   - Training schedules

## API Endpoints Tested

### Authentication
- ✅ `POST /auth/signup`
- ✅ `POST /auth/login`
- ✅ `POST /auth/refresh` (automatic via interceptor)
- ✅ `POST /auth/change-password`

### User
- ✅ `GET /me`
- ✅ `PATCH /me/profile`
- ✅ `PATCH /me/become-trainer`

### Trainer
- ✅ `GET /trainer`
- ✅ `PATCH /trainer`

### Protocol Templates
- ✅ `GET /trainer/protocol-templates`
- ✅ `POST /trainer/protocol-templates`
- ✅ `PATCH /trainer/protocol-templates/:id`
- ✅ `DELETE /trainer/protocol-templates/:id`

### Training Templates
- ✅ `GET /trainer/training-templates`
- ✅ `POST /trainer/training-templates`
- ✅ `PATCH /trainer/training-templates/:id`
- ✅ `DELETE /trainer/training-templates/:id`

### Training Protocols
- ✅ `GET /trainer/protocols`
- ✅ `POST /trainer/protocols`
- ✅ `GET /trainer/protocols/:id`
- ✅ `PATCH /trainer/protocols/:id`
- ✅ `DELETE /trainer/protocols/:id`

### Trainings
- ✅ `GET /trainer/protocols/:id/trainings`
- ✅ `POST /trainer/protocols/:id/trainings`
- ✅ `PATCH /trainer/protocols/:protocolId/trainings/:id`
- ✅ `DELETE /trainer/protocols/:protocolId/trainings/:id`

### Training Schedules
- ✅ `POST /trainer/protocols/:protocolId/trainings/:trainingId/schedule`
- ✅ `DELETE /trainer/protocols/:protocolId/trainings/:trainingId/schedule/:scheduleId`

### My Protocols (Student)
- ✅ `GET /my/protocols`
- ✅ `GET /my/protocols/:id`

## Common Issues

### CORS Errors
- Make sure the backend is configured to allow `http://localhost:5173` (or your dev port)
- The backend should have CORS enabled for development

### 401 Unauthorized
- Check that tokens are being stored in localStorage
- Verify the token refresh logic is working
- Try logging out and logging back in

### Network Errors
- Ensure the backend is running on `http://localhost:3000`
- Check that the database is running
- Verify the backend logs for errors

## Browser DevTools

### Check Auth State
Open browser console and run:
```javascript
// Check stored tokens
console.log(localStorage.getItem('accessToken'));
console.log(localStorage.getItem('refreshToken'));
console.log(localStorage.getItem('user'));
```

### Monitor Network Requests
1. Open DevTools Network tab
2. Watch for API requests to `localhost:3000`
3. Check request headers for `Authorization: Bearer <token>`
4. Verify response status codes

## Success Criteria

The app is working correctly if:
- ✅ You can sign up and log in
- ✅ Profile updates are saved
- ✅ Becoming a trainer adds the role
- ✅ All CRUD operations work for templates and protocols
- ✅ Trainings can be added and scheduled
- ✅ Students can view their assigned protocols
- ✅ Token refresh happens automatically on 401 errors
- ✅ The UI is responsive and looks good
- ✅ No console errors (except expected 401s that trigger refresh)
