# Slideshow Generator

A beautiful, step-by-step slideshow generator with Google Drive integration for saving and loading your projects.

## Features

- **Step-by-step wizard** for creating slideshows
- **Multiple image groups** with customizable names
- **Transition effects** (fade, slide, zoom, flip, dissolve)
- **Background music** selection
- **Custom background images**
- **Google Drive integration** for saving/loading slideshows
- **High-quality video export** (1080p)

## Google Drive Setup

To enable Google Drive integration for saving and loading slideshows:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API and Google+ API
4. Create credentials (OAuth 2.0 Client ID)
5. Add your domain to authorized origins
6. Copy the Client ID and API Key to your `.env` file

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_GOOGLE_API_KEY=your_google_api_key_here
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your Google API credentials (see above)

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and start creating slideshows!

## Heroku Deployment

To deploy this application to Heroku:

1. **Prerequisites:**
   - Install [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
   - Have a Heroku account
   - Set up Google API credentials

2. **Deploy Steps:**
   ```bash
   # Login to Heroku
   heroku login
   
   # Create a new Heroku app
   heroku create your-slideshow-app-name
   
   # Set environment variables
   heroku config:set VITE_GOOGLE_CLIENT_ID=your_google_client_id
   heroku config:set VITE_GOOGLE_API_KEY=your_google_api_key
   
   # Deploy the application
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

3. **Important Notes:**
   - The app will automatically build during deployment (`heroku-postbuild` script)
   - Make sure to add your Heroku app URL to Google OAuth authorized origins
   - Environment variables must be set in Heroku dashboard or via CLI

4. **Google OAuth Setup for Heroku:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Add your Heroku app URL (e.g., `https://your-app.herokuapp.com`) to:
     - Authorized JavaScript origins
     - Authorized redirect URIs

## Usage

1. **Sign in** with your Google account (optional, but required for saving)
2. **Upload photos** for each image group
3. **Choose transition effects** between photos
4. **Select background music** (optional)
5. **Add a custom background image** (optional)
6. **Preview and generate** your slideshow video
7. **Save your project** to Google Drive for later use

## Technologies Used

- React + TypeScript
- Tailwind CSS
- Google Drive API
- Google OAuth 2.0
- Canvas API for video generation
- Vite for development and building

## License

MIT License - feel free to use this project for your own slideshows!