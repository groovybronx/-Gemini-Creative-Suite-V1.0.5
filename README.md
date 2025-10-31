# Gemini Creative Suite

## 1. Project Description

Gemini Creative Suite is a modern web application designed as a versatile and powerful interface for interacting with Google's state-of-the-art AI models. It provides users with a seamless experience for a variety of generative tasks, from conversational AI to advanced image creation and editing.

The application serves as a creative partner, enabling users to brainstorm ideas with a chatbot, generate high-quality images from text prompts, and perform sophisticated edits on existing images, all within a unified and intuitive environment.

## 2. Core Features

### a. Multi-Model AI Chatbot
- **Conversational AI:** Engage in dynamic, context-aware conversations with Google's Gemini models.
- **Model Selection:** Users can choose between **Gemini 2.5 Flash** for rapid responses or **Gemini 2.5 Pro** for more complex reasoning and detailed answers.
- **Persistent History:** Every chat is automatically saved, allowing users to resume conversations at any time.

### b. Advanced Image Generation
- **Multiple Imagen Models:** Generate images using a selection of powerful models, including `Imagen 3.0`, `Imagen 4.0`, `Imagen 4.0 Ultra`, and `Imagen 4.0 Fast`.
- **Fine-Grained Control:** Users can customize their creations with a comprehensive set of parameters:
    - **Aspect Ratio:** Choose from various formats (1:1, 16:9, 9:16, etc.).
    - **File Type:** Output images as JPEG or PNG.
- **Iterative Workflow:** All generations within a session are saved sequentially, creating a visual history of the creative process.

### c. AI-Powered Image Analysis & Editing
- **Image Upload:** Users can upload their own images to analyze and edit.
- **Gemini Analysis:** Get a detailed description and analysis of an uploaded image.
- **Intuitive Editing:** Use simple text prompts (e.g., "add a retro filter," "remove the person in the background") to perform complex image edits powered by Gemini.
- **Sequential Edits:** Apply edits iteratively, with each new change building upon the previous one.

### d. Unified History & Session Management
- **Centralized History:** All sessions—chats, image generations, and edits—are stored in a single, easily accessible history sidebar.
- **Quick Access:** Search conversations by keyword, sort by date, or filter by favorites.
- **Seamless Context Switching:** Select any past session to instantly load the corresponding view and its entire history.

### e. Customizable User Interface
- **Modern Design:** A clean, responsive interface built with Tailwind CSS.
- **Theme Selection:** Choose from multiple themes.
- **Unified History:** Access the complete chat and image history within the app.
- **Dynamic Sizing:** Images and editor thumbnails automatically adjust size for optimal display.
- **Retractable Panels:** Hide or reveal the settings and history panels with a single click to maximize the working space.

## 3. Technical Architecture
- **Frontend:** Built with **React** and **TypeScript** for a robust and type-safe user interface.
- **AI Integration:** Utilizes the **`@google/genai`** SDK to communicate with the Gemini and Imagen APIs.
- **Styling:** Styled with **Tailwind CSS** for a modern and responsive design. The app features a dynamic theming system using CSS variables.
- **Local Storage:**
    - **IndexedDB:** All conversation and session history is stored locally using IndexedDB, ensuring data persistence and offline access.
    - **Local Storage:** User theme preferences are saved in the browser's local storage.
- **Modularity:** The application is structured with a clear separation of concerns, using distinct components, services, and hooks to ensure code is clean, scalable, and maintainable.