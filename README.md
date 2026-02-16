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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
## Gestió i Manteniment

### Export Mensual de Factures i Pressupostos
S'ha implementat un workflow automàtic que s'executa el dia 1 de cada mes a les 03:00 AM.
Aquest workflow:
1. Extrau totes les factures i pressupostos del mes anterior.
2. Descarrega els PDFs corresponents del storage.
3. Crea un ZIP i l'envia per correu via Resend.

**Execució Manual:**
Pots forçar l'exportació d'un mes concret des de la pestanya **Actions** a GitHub, seleccionant "Monthly Billing Export" i indicant l'any i el mes desitjats.
"# buidant-la-bota-app" 
"# buidant-la-bota-app"
