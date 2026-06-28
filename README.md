# Recon

<div align="center">

**Your AI-Powered Development Assistant**

An intelligent CLI tool that helps you navigate, analyze, and modify codebases with the power of AI assistance.

</div>

## 🚀 Meet Recon - Your AI Agent

This project is maintained and enhanced by **Recon**, an AI coding assistant designed to help developers understand, navigate, and modify codebases efficiently. Eddy powers the intelligent agent modes in this project, providing contextual understanding and automated assistance.

## 📋 Overview

Eddy is a feature-rich command-line interface (CLI) tool built with TypeScript that provides:

- **Interactive Terminal UI** with animated banners and intuitive navigation
- **Agent Mode** - An AI-powered coding assistant that can analyze codebases, create/modify files, and execute operations
- **Ask Mode** - A read-only mode for querying and understanding your codebase
- **Approval Workflow** - All changes are staged and require approval before being applied
- **Multi-Provider AI Support** - Works with OpenRouter for flexible AI model selection

## 🛠️ Tech Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **TypeScript** | ^5 | Core programming language with type safety |
| **Bun** | latest | Runtime environment and package manager |
| **Node.js** | ^25.7.0 | Backend runtime support |

### CLI & UI Frameworks

| Package | Version | Purpose |
|---------|---------|---------|
| **Commander** | ^14.0.3 | CLI argument parsing and command structure |
| **@clack/prompts** | ^1.3.0 | Interactive terminal prompts and user input |
| **Figlet** | ^1.11.0 | ASCII art text generation for banners |
| **Chalk** | ^5.6.2 | Terminal string styling and colors |
| **Marked** | ^18.0.3 | Markdown parsing |
| **Marked-Terminal** | ^7.3.0 | Render markdown in terminal |

### AI & Machine Learning

| Package | Version | Purpose |
|---------|---------|---------|
| **AI SDK** | ^7.0.3 | Unified interface for AI providers and tools |
| **@openrouter/ai-sdk-provider** | ^2.9.0 | OpenRouter integration for AI models |
| **@mendable/firecrawl-js** | ^4.23.0 | Web scraping and content extraction |

### Utilities & Development

| Package | Version | Purpose |
|---------|---------|---------|
| **Diff** | ^9.0.0 | Text diffing for change visualization |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **@types/bun** | latest | TypeScript definitions for Bun |
| **@types/node** | ^25.7.0 | TypeScript definitions for Node.js |
| **@types/marked-terminal** | ^6.1.1 | TypeScript definitions for marked-terminal |



## 🎯 Features

### 1. **Wakeup Screen**
- Animated ASCII art banner with shadow effects
- Colorful terminal interface using custom hex colors
- Mode selection with intuitive prompts

### 2. **Agent Mode**
- AI-powered autonomous coding assistant
- Can read, create, modify, and delete files
- Executes shell commands (with safety checks)
- Tracks all actions and requires approval
- Maximum 40 steps per session
- Real-time tool execution visualization

### 3. **Ask Mode**
- Read-only mode for codebase queries
- Safe exploration without modifications
- Intelligent question answering about your code
- Code analysis and summarization

### 4. **Approval Workflow**
- All mutations are staged until approval
- Transparent action tracking
- Error handling and reporting
- Clean separation of concerns

## 🚀 Getting Started

### Prerequisites

- **Bun** (latest version recommended)
- **Node.js** (^25.7.0 or compatible)
- **OpenRouter API Key** (for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/openclaw.git
cd openclaw

# Install dependencies
bun install
```

### Usage

```bash
# Run the interactive CLI
bun run index.ts

# Or use specific commands
bun run index.ts wakeup
```

### Environment Setup

Create a `.env` file with your OpenRouter API key:

```env
OPENROUTER=your_api_key_here
```

## 💻 Commands

| Command | Description |
|---------|-------------|
| `wakeup` | Launch the interactive welcome screen |
| `cli` | Direct CLI mode access |

## 🎨 Visual Features

- **Animated Banners**: Dynamic ASCII art with color gradients
- **Interactive Prompts**: User-friendly selection menus
- **Real-time Feedback**: Spinner animations during AI processing
- **Markdown Rendering**: Beautiful terminal markdown display
- **Color-coded Output**: Intuitive color scheme for different message types

## 🔧 Configuration

The agent can be configured with:

- **CodeBase Path**: Set the workspace root
- **Excluded Files**: Ignore node_modules, .git, dist folders, etc.
- **Max File Size**: Limit file reading size (default: 1MB)
- **Tool Permissions**: Granular control over file operations and shell execution

## 📝 Example Workflows

### Agent Mode Workflow
1. Select "Agent Mode" from CLI
2. Describe your task in natural language
3. Review AI-generated actions
4. Approve or reject changes
5. Apply approved changes to your codebase

### Ask Mode Workflow
1. Select "Ask Mode" from CLI
2. Pose questions about your codebase
3. Receive AI-powered answers with code context
4. Explore code without making changes

## 🤝 Contributing

This project is maintained by Eddy. Contributions and feedback are welcome!

## 📄 License

MIT 
## 🙏 Acknowledgments

- Built with [Bun](https://bun.sh) runtime
- Powered by [OpenRouter](https://openrouter.ai) AI models
- Interactive prompts via [CLACK](https://github.com/nrwl/nx/tree/main/packages/cli)

---

<div align="center">
  <p><strong>Recon</strong> - Your intelligent development companion</p>
  <p>Made with ❤️ by Divyesh</p>
</div>
