<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Creative Studio Canvas

### **Advanced Node-Based Visual Programming for Generative AI**

A powerful, industrial-grade creative studio that utilizes a node-based architecture to orchestrate complex AI image generation and editing workflows. Designed for creators and developers, this platform provides a modular approach to visual synthesis, leveraging the latest Google Gemini models for high-fidelity output and intelligent image analysis.


---

## 🚀 Key Features

*   **Modular Node Architecture:** Build complex visual workflows by connecting specialized nodes for Text Input, Image Analysis, Generation, and Contextual Editing.
*   **Intelligent Image Analysis:** Specialized nodes powered by Gemini Vision to reverse-engineer prompts from existing imagery, enabling seamless style transfer and content replication.
*   **Precision Magic Editor:** A non-destructive editing node with integrated masking and "in-painting" capabilities to modify specific regions of an image through natural language.
*   **Multi-Modal Synthesis:** High-performance image generation nodes supporting both pure text-to-image and reference-based image-to-image transformations.
*   **Persistent Workflow Library:** Save and reload complex node configurations as reusable templates, facilitating professional consistency and collaboration.

## 🛠️ Technology Stack

*   **Core Framework:** React 18, TypeScript, Vite
*   **Graph Engine:** Custom-built React node-graph system with SVG-based edge routing
*   **Artificial Intelligence:** Google Gemini 2.5 Flash (Image Analysis & Multimodal Generation)
*   **Interactive UI:** Framer Motion for canvas transitions, Tailwind CSS for industrial-grade UI system
*   **State Management:** Complex localized state for node hierarchies and port connectivity

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

