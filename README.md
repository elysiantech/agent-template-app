# AI Agent Template Application

This template application provides a solid foundation for building AI agents, particularly those that interact with users through text-based interfaces (chatbots, conversational AI, etc.). It's designed to be flexible, extensible, and easy to use as a starting point for various AI-powered projects.

## Features

*   **Modular Tool Integration:** Easily integrate various tools (search, calculators, data retrieval) that your AI agent can leverage.
*   **Model Management:** Seamlessly switch between different language models (OpenAI, Fireworks, etc.) based on availability and your project's needs.
*   **API Key Management:** Securely handle API keys for various AI services using environment variables.
*   **User Interactions:** Provides a starting point for handling user messages, generating responses, and managing conversation state.
*   **Speech Generation:** You can generate speech with a text input.
*   **NextJS 14**: this project use nextjs 14 server action.
*   **AI-SDK**: this project is using the new AI-SDK that provide useful helper to interact with AI models.
*   **Langgraph**: this project is using Langgraph to do Agent orchestration

## Project Structure

The project is organized into the following key directories:

*   **`src/`:** Main source code directory.
    *   **`src/ai/`:** Core AI logic.
        *   **`src/ai/models.ts`:** Defines available language models and their providers.
        *   **`src/ai/tools/`:** Contains the definition of tools for the agents.
        *   **`src/ai/...`:** You can add other AI-related logic here (e.g., memory, planning).
    *   **`src/app/`:** Next.js application logic.
        *   **`src/app/api/`:** API routes (for example, to connect to the chat).
        *   **`src/app/components/`:** Reusable React components.
        *   **`src/app/actions.ts`**: contains the server actions.
        *   **`src/app/...`:**  Other Next.js application components.

## Getting Started

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd <your-project-directory>
    ```

2.  **Install Dependencies:**
    ```bash
    npm install # or yarn install or pnpm install
    ```

3.  **Environment Variables:**
    *   Create a `.env.local` file in the root directory.
    *   Add your API keys for the following services:
        ```
        OPENAI_API_KEY=your_openai_api_key
        FIREWORKS_API_KEY=your_fireworks_api_key
        DEEPINFRA_API_KEY=your_deepinfra_api_key
        GOOGLE_API_KEY=your_google_api_key
        TOGETHER_API_KEY=your_togetherai_api_key
        ELEVENLABS_API_KEY=your_elevenlabs_api_key
        ```

4.  **Run the Application:**
    ```bash
    npm run dev # or yarn dev or pnpm dev
    ```

5.  **Access:** Open your browser and go to `http://localhost:3000` (or the URL displayed in your terminal).


## Extending the Template

This template is designed to be extended. Here are some common ways you'll likely want to customize it:

1.  **Adding New Tools:**
    *   Create a new file (e.g., `my-tool.ts`) in the `src/ai/tools/` directory.
    *   Define your tool logic in that file.
    *   Import and export your new tool in `src/ai/tools/index.ts`.

2.  **Integrating New Models:**
    *   Add a new model definition to `src/ai/models.ts`.
    *   Make sure to add your API key to the `.env.local` file.
    * modify the `getModels` function accordingly.

3.  **Customizing Interactions:**
    *   Modify the API route (`src/app/api/...`) to handle user messages and generate responses.
    * You can use the server actions to process the response, and interact with the AI models.

4. Add new Server Actions:
    * create a new function in `src/app/actions.ts` and `export` it.

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests to help improve this template.

## License

[MIT License or your choice of license]
