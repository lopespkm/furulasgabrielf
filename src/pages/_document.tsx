import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="pt-BR" className="dark">
      <Head>
        <meta name="title" content={`${process.env.NEXT_PUBLIC_APP_NAME}`} />
        <meta name="description" content={`Jogue raspadinhas online e ganhe prêmios reais! PIX na conta, produtos incríveis e muito mais. Diversão garantida com segurança total.`} />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
