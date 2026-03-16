# Description

As a home theater entusiast I want to create a 3D visualizer application to understand the relationship between sceen diagonal measurement, screen viewing distance and the horizontal viewing angle that results.  OptiView is the result of the following prompt used by agentic AI Google AntiGravity.  The model used was Gemini 3 Flash Preview on the free tier.  The implementation took approximately 1 minute to create.  Enjoy.

# Google Antigravity Prompt Used

Create a single page html app using javascript to display the relationship between diagonal screen measurement, the viewing distance from that screen and the horizontal viewing angle that results. allow a slider for diagonal screen measurement from 42 inches up to and including 120 inches. have another slider for seating distance in feet with half-foot increments from 5 feet to 25 feet. have a toggle to change screen aspect ration from 16:9 to to 4:3 with 16:9 being the default. Display the viewing screen and the seated view three dimensionally.  Make the UI light themed.

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f8646e9f-f00d-42d4-b067-0afcd3ee67da

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
4. go to URL `http://localhost:3000/`
