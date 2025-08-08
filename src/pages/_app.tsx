import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import Head from 'next/head'
import { useEffect } from 'react'
import { initFacebookPixel } from '@/lib/facebook-pixel'

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Inicializar Facebook Pixel
    const pixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
    console.log('🔍 Facebook Pixel: Verificando configuração', {
      pixelId: pixelId,
      hasPixelId: !!pixelId,
      nodeEnv: process.env.NODE_ENV,
      isClient: typeof window !== 'undefined',
      url: typeof window !== 'undefined' ? window.location.href : 'server'
    });
    
    if (pixelId) {
      console.log('🟢 Facebook Pixel: Inicializando com ID:', pixelId);
      const pixel = initFacebookPixel(pixelId);
      console.log('🟢 Facebook Pixel: Instância criada:', !!pixel);
    } else {
      console.log('🔴 Facebook Pixel: NEXT_PUBLIC_FACEBOOK_PIXEL_ID não configurado');
      console.log('💡 Dica: Adicione NEXT_PUBLIC_FACEBOOK_PIXEL_ID no arquivo .env.local');
    }
  }, []);

  return (
    <AuthProvider>
      <Head>
        <title>{process.env.NEXT_PUBLIC_APP_NAME} - Raspadinhas Online com Prêmios Reais</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
      <Toaster 
        position="top-center"
        richColors
        theme="dark"
        closeButton
      />
    </AuthProvider>
  )
}
