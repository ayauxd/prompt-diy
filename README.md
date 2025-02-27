# CrackedPrompts

A modern, accessible prompt engineering tool with multiple modes to help you create better prompts for AI models.

## Features

- **Multiple Prompt Modes**: Choose between Quick, Creative Flow, and CrackedAF modes for different prompt generation styles
- **Accessibility Focused**: WCAG 2.1 AA compliant with proper contrast ratios and ARIA attributes
- **Responsive Design**: Works seamlessly on mobile and desktop devices
- **Performance Optimized**: Lazy loading and code splitting for faster load times
- **Analytics Integration**: Track user engagement and session metrics
- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Copy Functionality**: Easily copy generated prompts to clipboard
- **Swipe Navigation**: Mobile-friendly gesture support with Hammer.js

## Technologies Used

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- React Router
- React Query
- Hammer.js for gesture support

## Getting Started

Follow these steps to run the project locally:

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd cracked

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at http://localhost:3000

## Project Structure

- `src/pages/Index.tsx`: Main application page with chat interface
- `src/components/ui/`: UI components from shadcn-ui
- `src/hooks/`: Custom React hooks
- `src/lib/`: Utility functions

## Accessibility Features

- High contrast UI elements
- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader friendly content

## Performance Optimizations

- Component lazy loading
- Optimized assets
- Efficient state management
- Minimized re-renders

## License

MIT
