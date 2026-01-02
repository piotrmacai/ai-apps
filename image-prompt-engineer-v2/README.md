<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Image Prompt Engineer

### **Advanced Reverse-Engineering for Generative AI Prompts**

A sophisticated tool designed to bridge the gap between visual inspiration and technical execution. The AI Image Prompt Engineer analyzes uploaded imagery to extract deep semantic features, lighting conditions, and stylistic nuances, converting them into optimized prompts for text-to-image models.


---

## 🚀 Key Features

*   **Multimodal Translation:** Converts complex visual data into high-fidelity descriptive prompts using Google's Gemini Vision models.
*   **Structured Output Formats:** Provides prompts in standardized **Text**, **JSON**, and **YAML** formats, facilitating seamless integration with automated workflows and other AI tools.
*   **Prompt-to-Image Validation:** Built-in rendering engine to test generated prompts instantly using Imagen, allowing for iterative refinement.
*   **Recursive AI Chatbot:** An integrated conversational interface to further refine, expand, or adjust prompt parameters through natural language.
*   **Granular Parameter Control:** Dedicated panel for editing structured prompt components (subject, style, lighting, composition) individually.

## 🛠️ Technology Stack

*   **Framework:** React 18, TypeScript, Vite
*   **Artificial Intelligence:** Google Gemini API (Visual Analysis & Text Generation)
*   **Data Serialization:** `yaml` for structured prompt handling
*   **Design System:** Modern Dark UI, Tailwind CSS
*   **Components:** Custom-built accessible components with smooth micro-interactions

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

---
