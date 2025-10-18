# MirArt - Premium Art Gallery

A modern, responsive e-commerce website for selling original paintings built with React and Material-UI.

## Features

- **Modern Design**: Clean, professional interface with Material-UI components
- **Dark/Light Theme**: Toggle between light and dark themes with persistent settings
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
- **Art Gallery**: Browse paintings with filtering, sorting, and search functionality
- **Product Details**: Detailed view of each painting with specifications
- **Shopping Cart**: Add/remove items, update quantities, and view totals
- **Checkout Process**: Multi-step checkout with form validation
- **Order Management**: Order confirmation and success pages

## Technology Stack

- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Type-safe JavaScript for better development experience
- **Vite**: Fast build tool and development server
- **Material-UI 5**: Component library with custom theming
- **React Router**: Client-side routing
- **Context API**: State management for theme and cart
- **Responsive Design**: Mobile-first approach with breakpoints

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mirart
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Available Scripts

- `npm run dev` - Runs the app in development mode with Vite
- `npm run build` - Builds the app for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint for code quality
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Header.tsx      # Navigation header with theme toggle
│   ├── Footer.tsx     # Site footer with links
│   ├── Layout.tsx     # Main layout wrapper
│   └── PaintingCard.tsx # Individual painting card component
├── contexts/           # React Context providers
│   ├── ThemeContext.tsx # Theme management (light/dark)
│   └── CartContext.tsx # Shopping cart state management
├── data/              # Static data
│   └── paintings.ts   # Sample painting data
├── pages/             # Page components
│   ├── Home.tsx       # Homepage with hero section
│   ├── Gallery.tsx    # Art gallery with filters
│   ├── PaintingDetail.tsx # Individual painting details
│   ├── Cart.tsx       # Shopping cart page
│   ├── Checkout.tsx   # Checkout process
│   ├── OrderSuccess.tsx # Order confirmation
│   ├── About.tsx      # About page
│   └── Contact.tsx    # Contact page
├── types/             # TypeScript type definitions
│   └── index.ts       # Shared type definitions
├── theme.ts           # Material-UI theme configuration
├── App.tsx            # Main app component with routing
└── index.tsx          # React app entry point
```

## Key Features

### Theme System
- Custom light and dark themes
- Persistent theme selection
- Smooth theme transitions
- Consistent color palette

### Shopping Experience
- Product gallery with filtering and sorting
- Detailed product pages
- Shopping cart with quantity management
- Multi-step checkout process
- Order confirmation

### Responsive Design
- Mobile-first approach
- Breakpoint-based layouts
- Touch-friendly interactions
- Optimized for all screen sizes

## Customization

### Adding New Paintings
Edit `src/data/paintings.js` to add new paintings to the gallery:

```javascript
{
  id: 7,
  title: "Your Painting Title",
  artist: "Artist Name",
  price: 500,
  image: "image-url",
  description: "Painting description",
  category: "Category",
  dimensions: "24x36 inches",
  medium: "Oil on Canvas",
  year: 2023,
  inStock: true,
}
```

### Customizing Themes
Modify `src/theme.js` to adjust colors, typography, and component styles.

### Adding New Pages
1. Create a new component in `src/pages/`
2. Add the route to `src/App.js`
3. Update navigation in `src/components/Header.js`

## Deployment

### Build for Production
```bash
npm run build
```

This creates an optimized production build in the `dist` folder.

### Preview Production Build
```bash
npm run preview
```

This serves the production build locally for testing.

### Deploy to Netlify/Vercel
1. Connect your repository to your hosting platform
2. Set build command to `npm run build`
3. Set publish directory to `dist`
4. Deploy!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
