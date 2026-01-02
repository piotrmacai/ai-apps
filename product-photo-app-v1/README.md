<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Product Photo Designer

### **Professional Studio-Quality Product Photography via Generative AI**

A comprehensive AI-driven creative suite engineered to transform standard product shots into professional, studio-grade marketing assets. By combining multimodal chat interfaces with advanced image-to-image synthesis, this platform enables high-fidelity background replacement, contextual re-lighting, and creative scene composition tailored for e-commerce and digital branding.

---

## 🚀 Core Capabilities

*   **Reference-Based Generation:** Uses custom product images as persistent visual anchors, ensuring consistent product identity across various generated scenes.
*   **Multimodal Canvas Chat:** A sophisticated conversational interface to direct AI editing through natural language, supporting both global scene changes and granular adjustments.
*   **Interactive Sketch-to-Image:** Built-in sketching engine that allows users to guide the AI by drawing compositional cues or masks directly onto source images.
*   **Dynamic Scene Orchestration:** Automated background synthesis and lighting adjustment to place products in any context—from minimalist studio sets to complex lifestyle environments.
*   **Session-Based Project Management:** Robust local storage architecture for managing multiple creative projects, including full message history and high-resolution galleries.

## 🛠️ Technology Stack

*   **Frontend Ecosystem:** React 19, TypeScript, Vite
*   **Visual Engine:** Google Gemini SDK (Gemini 2.5 Flash & Imagen)
*   **State Architecture:** Complex session management with localized persistence (LocalStorage)
*   **UI System:** Modern Dark/Light theme support, Tailwind CSS, high-performance image rendering
*   **Interactions:** Custom canvas sketching modal and asynchronous multi-image generation pipelines

## 🔧 Installation & Setup

1.  **Clone the Repository & Install Dependencies**
    ```bash
    npm install
    ```

2.  **Configure Environment Variables**
    Create a `.env.local` file in the root directory:
    ```env
    GEMINI_API_KEY=your_api_key_here
    ```

3.  **Run Development Server**
    ```bash
    npm run dev
    ```


