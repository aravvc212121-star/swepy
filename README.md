This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Real-Time Helper Tracking

Swepy includes a free, portable real-time helper tracking system powered by MapLibre GL JS, OpenFreeMap, and straight-line / OpenRouteService routing.

### Two-Window Testing Workflow
1. Open the Customer Tracking screen at `/booking/demo` in one browser window.
2. Open the Helper Home screen at `/helper/orders` in another browser window.
3. Open the Dev Simulator at `/dev/track-sim` to replay a realistic 20–25 km/h driving route. You will see the helper marker move smoothly with route updates and dynamic ETA.

### Geolocation Simulation via Chrome DevTools
You can also simulate custom or moving GPS coordinates directly in your browser:
1. Open Chrome DevTools (`F12` or `Ctrl+Shift+I`).
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac), type **Show Sensors**, and select **Sensors**.
3. Under the **Location** dropdown, choose a preset or select **Other...** to enter custom latitude and longitude coordinates.
4. As you adjust coordinates, both `/helper/orders` and `/booking/demo` will track and reflect the changes.


## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
