# Gemini Creative Suite

## 1. Project Description

Gemini Creative Suite is a modern web application designed as a versatile and powerful interface for interacting with Google's state-of-the-art AI models. It provides users with a seamless experience for a variety of generative tasks, from conversational AI to advanced image creation and editing.

The application serves as a creative partner, enabling users to brainstorm ideas, generate high-quality images, and perform sophisticated edits on existing images, all within a unified and intuitive environment.

## 2. Core Features

### a. Unified AI Chatbot & Image Generator
- **Conversational AI:** Engage in dynamic, context-aware conversations with Google's Gemini models. You can choose between **Gemini 2.5 Flash** for rapid responses or **Gemini 2.5 Pro** for more complex reasoning.
- **Integrated Image Generation:** Generate stunning images directly within the chat interface. A dedicated panel allows you to craft the perfect prompt and select from powerful models like **Imagen 3.0** and **Imagen 4.0**.
- **Fine-Grained Control:** Customize your creations by specifying aspect ratios (1:1, 16:9, etc.), the number of images, and file types (JPEG/PNG).
- **Multimedia Chat:** Upload your own images to discuss them with the AI.
- **Persistent History:** Every chat, including text and generated images, is automatically saved as a single conversation.

### b. AI-Powered Image Analysis & Editing
- **Dedicated Editing Workflow:** A separate "Edit Image" view provides a focused workspace for image manipulation.
- **Image Upload:** Users can upload their own images to analyze and edit.
- **Gemini Analysis:** Get a detailed description and analysis of an uploaded image to inspire editing ideas.
- **Intuitive Prompt-Based Editing:** Use simple text prompts (e.g., "add a retro filter," "make the sky dramatic") to perform complex image edits powered by Gemini.
- **Version History:** Track your edits. The application saves each step, allowing you to view and branch from any point in your creative process.

### c. Unified History & Session Management
- **Centralized History:** All sessions—chats and image edits—are stored in a single, easily accessible history sidebar.
- **Quick Access:** Search conversations by keyword, sort by date, or filter by favorites to quickly find any past session.
- **Seamless Context Switching:** Select any past session to instantly load the corresponding view and its entire history.

### d. Customizable User Interface
- **Modern Design:** A clean, responsive interface built with Tailwind CSS.
- **Theme Selection:** Choose from multiple built-in themes (Light, Dark, High Contrast) or create your own with a detailed color picker.
- **Flexible Layout:** Retractable panels for history and settings allow you to maximize your workspace.
- **Intuitive Image Viewer:** View generated or edited images in a full-screen gallery with zoom, pan, and download capabilities.

## 3. Technical Architecture
- **Frontend:** Built with **React** and **TypeScript** for a robust and type-safe user interface.
- **AI Integration:** Utilizes the **`@google/genai`** SDK to communicate with the Gemini and Imagen APIs.
- **Styling:** Styled with **Tailwind CSS** for a modern and responsive design. The app features a dynamic theming system using CSS variables.
- **Local Storage:**
    - **IndexedDB:** All conversation and session history is stored locally using IndexedDB, ensuring data persistence and offline access.
    - **Local Storage:** User theme preferences are saved in the browser's local storage.
- **Modularity:** The application is structured with a clear separation of concerns, using distinct components, services, and hooks to ensure code is clean, scalable, and maintainable.
