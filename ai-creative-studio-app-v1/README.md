<div align="center">
<img width="1200" height="475" alt="AI Creative Studio Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🎨 AI Creative Image Studio
**Advanced Image Suite for Object-Level AI Editing & Generation**

</div>

---

## 🚀 Features
*   **Intelligent Generation**: Creates multiple conceptual variations using **Imagen 4.0**.
*   **Object Segmentation**: Automatically detects and labels objects in images using **Gemini 2.5 Flash**.
*   **Precision Inpainting**: Edit specific objects by selecting them in the layer panel; the app generates precise masks for **Gemini 2.5 Flash-Image**.
*   **Visual Repositioning**: Physically "move" objects in the UI; AI re-composes the scene based on visual movement cues.
*   **Multimodal Editing**: Supports reference images to guide textures and styles.
*   **Creative History**: Visual timeline to navigate through every step of the editing process.
*   **Web Grounding**: Optional web search to inform creative plans with real-world design trends.

## 💻 Tech Stack
*   **Frontend**: React 19, TypeScript, Vite.
*   **AI Models**: Gemini 2.5 Flash (Planning/Vision), Gemini 2.5 Flash-Image (Editing), Imagen 4.0 (Generation).
*   **APIs**: Google Generative AI SDK (@google/genai).
*   **Logic**: Custom i18n implementation, SVG-based interactive bounding boxes, and hierarchical object tree management.

## 🛠️ Installation

1.  **Clone & Install**:
    ```bash
    npm install
    ```
2.  **Environment Setup**:
    Add your API key to `.env.local`:
    ```env
    GEMINI_API_KEY=your_key_here
    ```
3.  **Run**:
    ```bash
    npm run dev
    ```


