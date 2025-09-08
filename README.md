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
3. Enable the Google Drive API, Google+ API, and Google Photos Library API
4. Create credentials (OAuth 2.0 Client ID)
5. Add your domain to authorized origins
6. Copy the Client ID and API Key to your `.env` file

## Google Photos Setup

To enable Google Photos integration for selecting photos:

1. In the same Google Cloud Console project
2. Enable the **Google Photos Library API**
3. The same OAuth 2.0 Client ID will work for both Drive and Photos
4. Make sure your domain is in the authorized origins
5. Users will be prompted to grant Photos access when they first use the feature

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