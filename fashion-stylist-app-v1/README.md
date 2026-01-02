<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Fashion Stylist

### **Next-Generation Virtual Try-On & Wardrobe Management**

An advanced AI-powered dressing room application that transforms static fashion imagery into an interactive, multi-angle styling experience. Built with a focus on high-fidelity visual rendering and seamless user interaction, this platform demonstrates the practical application of Multimodal AI in the retail and fashion tech sectors.


---

## 🚀 Core Capabilities

*   **Neural Virtual Try-On:** Leverages Google's Gemini models to accurately map garments onto user-provided images while maintaining texture, lighting, and garment drape.
*   **Multi-Pose Synthesis:** Dynamically generates various professional model poses (Full Frontal, 3/4 View, Side Profile, Action Shots) for any outfit configuration.
*   **Layered Outfit Architecture:** Support for complex, multi-layer outfit building, enabling users to stack tops, bottoms, and outerwear realistically.
*   **Contextual Scene Adaptation:** Real-time background replacement and scene re-lighting to visualize outfits in various environments (Urban, Event, Formal).
*   **Session Management:** Robust system for saving, loading, and managing multiple styling sessions with persistent state.

## 🛠️ Tech Stack

*   **Frontend Ecosystem:** React 18, TypeScript, Vite
*   **Visual Engine:** Google Gemini API (Visual & Multimodal)
*   **Animations:** Framer Motion for high-end micro-interactions
*   **Styling:** Tailwind CSS (Utility-first, responsive architecture)
*   **Performance:** Optimized image processing and lazy loading for high-resolution assets

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

## 📈 Professional Highlights

*   **AI Integration:** Deep integration with Generative AI APIs, handling complex prompt engineering and image-to-image transformations.
*   **UX/UI Excellence:** Mobile-first, responsive design with professional-grade animations and transitions.
*   **State Architecture:** Managed complex application states for history tracking, pose variations, and session persistence.
