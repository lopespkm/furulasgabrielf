// Facebook Pixel Configuration
declare global {
  interface Window {
    fbq: any;
  }
}

// Tipos de eventos do Facebook Pixel
export type FacebookEventType = 
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Purchase'
  | 'Lead'
  | 'CompleteRegistration'
  | 'Contact'
  | 'CustomizeProduct'
  | 'Donate'
  | 'FindLocation'
  | 'Schedule'
  | 'StartOrder'
  | 'Subscribe'
  | 'SubmitApplication'
  | 'Subscribe';

// Interface para dados do evento
export interface FacebookEventData {
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
  num_items?: number;
  search_string?: string;
  status?: boolean;
  [key: string]: any;
}

class FacebookPixel {
  private pixelId: string;
  private isInitialized: boolean = false;

  constructor(pixelId: string) {
    this.pixelId = pixelId;
  }

  // Inicializar o Pixel
  init(): void {
    if (typeof window === 'undefined' || this.isInitialized) {
      console.log('🔴 Facebook Pixel: Inicialização ignorada - servidor ou já inicializado');
      return;
    }

    console.log('🟡 Facebook Pixel: Iniciando inicialização...', {
      pixelId: this.pixelId,
      userAgent: window.navigator.userAgent,
      url: window.location.href
    });

    // Carregar script do Facebook Pixel
    const script = document.createElement('script');
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      
      console.log('🟡 Facebook Pixel: Script carregado, inicializando...');
      fbq('init', '${this.pixelId}');
      fbq('track', 'PageView');
      console.log('🟢 Facebook Pixel: Script carregado e inicializado com sucesso');
      
      // Verificar se fbq está disponível
      if (typeof fbq === 'function') {
        console.log('✅ Facebook Pixel: Função fbq disponível');
      } else {
        console.log('❌ Facebook Pixel: Função fbq não disponível');
      }
    `;
    
    // Adicionar tratamento de erro para o script
    script.onerror = () => {
      console.log('🔴 Facebook Pixel: Erro ao carregar script - possivelmente bloqueado por AdBlocker');
      this.handleAdBlockerDetection();
    };
    
    document.head.appendChild(script);

    // Adicionar noscript tag
    const noscript = document.createElement('noscript');
    noscript.innerHTML = `
      <img height="1" width="1" style="display:none"
      src="https://www.facebook.com/tr?id=${this.pixelId}&ev=PageView&noscript=1"/>
    `;
    document.head.appendChild(noscript);

    // Verificar se o script foi carregado após um tempo
    setTimeout(() => {
      if (!window.fbq) {
        console.log('🔴 Facebook Pixel: Script não carregado após timeout - possivelmente bloqueado');
        this.handleAdBlockerDetection();
      } else {
        console.log('🟢 Facebook Pixel: Script carregado com sucesso, fbq disponível');
        // Fazer um teste de tracking
        try {
          window.fbq('track', 'PageView');
          console.log('✅ Facebook Pixel: Teste de tracking bem-sucedido');
        } catch (error) {
          console.log('❌ Facebook Pixel: Erro no teste de tracking:', error);
        }
      }
    }, 3000);

    this.isInitialized = true;
    console.log('🟢 Facebook Pixel: Inicialização concluída com sucesso');
  }

  // Detectar e lidar com bloqueador de anúncios
  private handleAdBlockerDetection(): void {
    console.log('🟡 Facebook Pixel: Detectado possível bloqueador de anúncios');
    
    // Tentar carregar uma imagem do Facebook para confirmar bloqueio
    const testImage = new Image();
    testImage.onload = () => {
      console.log('🟢 Facebook Pixel: Imagem de teste carregada - sem bloqueador');
    };
    testImage.onerror = () => {
      console.log('🔴 Facebook Pixel: Bloqueador de anúncios confirmado');
      this.showAdBlockerWarning();
    };
    testImage.src = 'https://www.facebook.com/favicon.ico';
  }

  // Mostrar aviso sobre bloqueador de anúncios
  private showAdBlockerWarning(): void {
    // Criar notificação no console
    console.log(`
      🚨 FACEBOOK PIXEL BLOQUEADO
      
      O Facebook Pixel está sendo bloqueado por um bloqueador de anúncios.
      Isso pode afetar o rastreamento de eventos e campanhas publicitárias.
      
      Para testar o tracking:
      1. Desative temporariamente o bloqueador de anúncios
      2. Recarregue a página
      3. Verifique os logs do console
      
      Em produção, considere:
      - Solicitar aos usuários que desativem o bloqueador
      - Implementar detecção de bloqueador na interface
      - Usar fallbacks para métricas alternativas
    `);
  }

  // Rastrear evento
  track(eventName: FacebookEventType, data?: FacebookEventData): void {
    if (typeof window === 'undefined' || !this.isInitialized) {
      console.log('🔴 Facebook Pixel: Não inicializado ou não disponível no servidor');
      return;
    }

    if (window.fbq) {
      console.log('🟢 Facebook Pixel: Enviando evento', {
        event: eventName,
        data: data,
        pixelId: this.pixelId
      });
      try {
        window.fbq('track', eventName, data);
      } catch (error) {
        console.log('🔴 Facebook Pixel: Erro ao enviar evento', error);
      }
    } else {
      console.log('🔴 Facebook Pixel: Função fbq não encontrada - possivelmente bloqueada por AdBlocker');
      console.log('📊 Evento perdido:', { event: eventName, data: data });
      
      // Armazenar eventos perdidos para possível recuperação
      this.storeLostEvent(eventName, data);
    }
  }

  // Armazenar eventos perdidos
  private storeLostEvent(eventName: FacebookEventType, data?: FacebookEventData): void {
    if (typeof window === 'undefined') return;
    
    const lostEvents = JSON.parse(localStorage.getItem('facebook_pixel_lost_events') || '[]');
    lostEvents.push({
      event: eventName,
      data: data,
      timestamp: new Date().toISOString()
    });
    
    // Manter apenas os últimos 50 eventos
    if (lostEvents.length > 50) {
      lostEvents.splice(0, lostEvents.length - 50);
    }
    
    localStorage.setItem('facebook_pixel_lost_events', JSON.stringify(lostEvents));
    console.log('💾 Facebook Pixel: Evento perdido armazenado para recuperação posterior');
  }

  // Rastrear visualização de página
  trackPageView(): void {
    this.track('PageView');
  }

  // Rastrear visualização de conteúdo
  trackViewContent(contentName: string, contentCategory?: string, value?: number): void {
    this.track('ViewContent', {
      content_name: contentName,
      content_category: contentCategory,
      value: value,
      currency: 'BRL'
    });
  }

  // Rastrear adição ao carrinho
  trackAddToCart(contentName: string, value: number, contentIds?: string[]): void {
    this.track('AddToCart', {
      content_name: contentName,
      value: value,
      currency: 'BRL',
      content_ids: contentIds
    });
  }

  // Rastrear início de checkout
  trackInitiateCheckout(value: number, contentIds?: string[]): void {
    this.track('InitiateCheckout', {
      value: value,
      currency: 'BRL',
      content_ids: contentIds
    });
  }

  // Rastrear compra
  trackPurchase(value: number, contentIds?: string[], numItems?: number): void {
    this.track('Purchase', {
      value: value,
      currency: 'BRL',
      content_ids: contentIds,
      num_items: numItems
    });
  }

  // Rastrear lead
  trackLead(value?: number, contentName?: string): void {
    this.track('Lead', {
      value: value,
      currency: 'BRL',
      content_name: contentName
    });
  }

  // Rastrear registro completo
  trackCompleteRegistration(value?: number, contentName?: string): void {
    this.track('CompleteRegistration', {
      value: value,
      currency: 'BRL',
      content_name: contentName
    });
  }

  // Rastrear contato
  trackContact(contentName?: string): void {
    this.track('Contact', {
      content_name: contentName
    });
  }

  // Rastrear evento customizado
  trackCustom(eventName: string, data?: FacebookEventData): void {
    if (typeof window === 'undefined' || !this.isInitialized) return;

    if (window.fbq) {
      window.fbq('trackCustom', eventName, data);
    }
  }
}

// Instância global do Pixel
let facebookPixel: FacebookPixel | null = null;

// Função para inicializar o Pixel
export const initFacebookPixel = (pixelId: string): FacebookPixel => {
  if (!facebookPixel) {
    facebookPixel = new FacebookPixel(pixelId);
    facebookPixel.init();
  }
  return facebookPixel;
};

// Função para obter a instância do Pixel
export const getFacebookPixel = (): FacebookPixel | null => {
  return facebookPixel;
};

// Função para recuperar eventos perdidos
export const recoverLostEvents = (): void => {
  const pixel = getFacebookPixel();
  if (!pixel) return;
  
  if (typeof window === 'undefined') return;
  
  const lostEvents = JSON.parse(localStorage.getItem('facebook_pixel_lost_events') || '[]');
  
  if (lostEvents.length > 0) {
    console.log('🔄 Facebook Pixel: Recuperando eventos perdidos', { count: lostEvents.length });
    
    lostEvents.forEach((lostEvent: any) => {
      try {
        pixel.track(lostEvent.event, lostEvent.data);
        console.log('✅ Facebook Pixel: Evento recuperado', lostEvent);
      } catch (error) {
        console.log('❌ Facebook Pixel: Erro ao recuperar evento', error);
      }
    });
    
    // Limpar eventos recuperados
    localStorage.removeItem('facebook_pixel_lost_events');
    console.log('🧹 Facebook Pixel: Eventos perdidos limpos após recuperação');
  }
};

// Hooks para eventos específicos do seu projeto
export const trackScratchCardView = async (cardName: string, cardPrice: number): Promise<void> => {
  console.log('🎯 Facebook Pixel: trackScratchCardView chamado', { cardName, cardPrice });
  
  // Obter geolocalização do usuário
  const location = await getUserLocation();
  console.log('🌍 Facebook Pixel: Localização para visualização de raspadinha obtida', location);
  
  const pixel = getFacebookPixel();
  if (pixel) {
    pixel.trackViewContent(cardName, 'ScratchCard', cardPrice);
    
    // Evento customizado com dados de geolocalização
    pixel.trackCustom('ScratchCardView', {
      content_name: cardName,
      content_category: 'ScratchCard',
      value: cardPrice,
      currency: 'BRL',
      user_country: location.country,
      user_region: location.region,
      user_city: location.city,
      user_ip: location.ip,
      location_available: !!(location.country || location.region || location.city)
    });
  } else {
    console.log('🔴 Facebook Pixel: trackScratchCardView - Pixel não encontrado');
  }
};

export const trackScratchCardPurchase = async (cardName: string, cardPrice: number, cardId: string): Promise<void> => {
  console.log('🎯 Facebook Pixel: trackScratchCardPurchase chamado', { cardName, cardPrice, cardId });
  
  // Obter geolocalização do usuário
  const location = await getUserLocation();
  console.log('🌍 Facebook Pixel: Localização para compra de raspadinha obtida', location);
  
  const pixel = getFacebookPixel();
  if (pixel) {
    pixel.trackAddToCart(cardName, cardPrice, [cardId]);
    pixel.trackInitiateCheckout(cardPrice, [cardId]);
    pixel.trackPurchase(cardPrice, [cardId], 1);
    
    // Evento customizado com dados de geolocalização
    pixel.trackCustom('ScratchCardPurchase', {
      content_name: cardName,
      content_category: 'ScratchCard',
      content_ids: [cardId],
      value: cardPrice,
      currency: 'BRL',
      num_items: 1,
      user_country: location.country,
      user_region: location.region,
      user_city: location.city,
      user_ip: location.ip,
      location_available: !!(location.country || location.region || location.city)
    });
  } else {
    console.log('🔴 Facebook Pixel: trackScratchCardPurchase - Pixel não encontrado');
  }
};

// Função para obter geolocalização baseada no IP com múltiplas APIs de fallback
const getUserLocation = async (): Promise<{ country?: string; region?: string; city?: string; ip?: string }> => {
  const apis = [
    'https://ipapi.co/json/',
    'https://ipinfo.io/json',
    'https://api.ipify.org?format=json'
  ];
  
  for (const api of apis) {
    try {
      console.log('🌍 Facebook Pixel: Tentando API:', api);
      const response = await fetch(api, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Timeout de 3 segundos
        signal: AbortSignal.timeout(3000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Padronizar resposta baseado na API
      let location = {};
      
      if (api.includes('ipapi.co')) {
        location = {
          country: data.country_name,
          region: data.region,
          city: data.city,
          ip: data.ip
        };
      } else if (api.includes('ipinfo.io')) {
        location = {
          country: data.country,
          region: data.region,
          city: data.city,
          ip: data.ip
        };
      } else if (api.includes('ipify.org')) {
        // ipify só retorna IP, vamos usar uma segunda API
        try {
          const geoResponse = await fetch(`https://ipapi.co/${data.ip}/json/`, {
            signal: AbortSignal.timeout(3000)
          });
          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            location = {
              country: geoData.country_name,
              region: geoData.region,
              city: geoData.city,
              ip: data.ip
            };
          }
        } catch (geoError) {
          console.log('🌍 Facebook Pixel: Erro na API secundária:', geoError);
          location = { ip: data.ip };
        }
      }
      
      console.log('🌍 Facebook Pixel: Localização obtida com sucesso via', api, location);
      return location;
      
    } catch (error: any) {
      console.log('🌍 Facebook Pixel: Erro na API', api, ':', error.message);
      continue; // Tentar próxima API
    }
  }
  
  // Se todas as APIs falharem, retornar objeto vazio
  console.log('🌍 Facebook Pixel: Todas as APIs de geolocalização falharam');
  return {};
};

export const trackUserRegistration = async (name?: string, email?: string, cpf?: string, inviteCode?: string | null): Promise<void> => {
  console.log('👤 Facebook Pixel: trackUserRegistration chamado', { name, email, cpf, inviteCode });
  
  // Obter geolocalização do usuário
  const location = await getUserLocation();
  console.log('🌍 Facebook Pixel: Localização final obtida', location);
  
  const pixel = getFacebookPixel();
  if (pixel) {
    pixel.trackCompleteRegistration(undefined, 'User Registration');
    
    // Evento customizado com dados adicionais para melhor performance
    pixel.trackCustom('UserRegistration', {
      content_name: 'User Registration',
      user_name: name,
      user_email: email,
      user_cpf: cpf, // Capturar CPF ao invés de telefone
      invite_code: inviteCode,
      registration_source: 'Auth Modal',
      has_invite_code: !!inviteCode,
      user_country: location.country,
      user_region: location.region,
      user_city: location.city,
      user_ip: location.ip,
      location_available: !!(location.country || location.region || location.city)
    });
  } else {
    console.log('🔴 Facebook Pixel: trackUserRegistration - Pixel não encontrado');
  }
};

// Rastrear quando o usuário INICIA um depósito (não confirmado ainda)
export const trackDepositInitiated = async (amount: number): Promise<void> => {
  console.log('💰 Facebook Pixel: trackDepositInitiated chamado', { amount });
  
  // Obter geolocalização do usuário
  const location = await getUserLocation();
  console.log('🌍 Facebook Pixel: Localização para início de depósito obtida', location);
  
  const pixel = getFacebookPixel();
  if (pixel) {
    // Apenas rastrear início do checkout, NÃO a compra
    pixel.trackInitiateCheckout(amount);
    
    // Evento customizado para depósito iniciado
    pixel.trackCustom('DepositInitiated', {
      value: amount,
      currency: 'BRL',
      user_country: location.country,
      user_region: location.region,
      user_city: location.city,
      user_ip: location.ip,
      location_available: !!(location.country || location.region || location.city)
    });
  } else {
    console.log('🔴 Facebook Pixel: trackDepositInitiated - Pixel não encontrado');
  }
};

// Rastrear quando o depósito é CONFIRMADO/PAGO
export const trackDepositConfirmed = async (amount: number): Promise<void> => {
  console.log('💰 Facebook Pixel: trackDepositConfirmed chamado', { amount });
  
  // Obter geolocalização do usuário
  const location = await getUserLocation();
  console.log('🌍 Facebook Pixel: Localização para depósito confirmado obtida', location);
  
  const pixel = getFacebookPixel();
  if (pixel) {
    // Rastrear a compra confirmada
    pixel.trackPurchase(amount);
    
    // Evento customizado para depósito confirmado
    pixel.trackCustom('DepositConfirmed', {
      value: amount,
      currency: 'BRL',
      user_country: location.country,
      user_region: location.region,
      user_city: location.city,
      user_ip: location.ip,
      location_available: !!(location.country || location.region || location.city)
    });
  } else {
    console.log('🔴 Facebook Pixel: trackDepositConfirmed - Pixel não encontrado');
  }
};

// Função legacy para compatibilidade (usar trackDepositInitiated)
export const trackDeposit = trackDepositInitiated;

export const trackWithdraw = async (amount: number): Promise<void> => {
  console.log('💸 Facebook Pixel: trackWithdraw chamado', { amount });
  
  // Obter geolocalização do usuário
  const location = await getUserLocation();
  console.log('🌍 Facebook Pixel: Localização para saque obtida', location);
  
  const pixel = getFacebookPixel();
  if (pixel) {
    pixel.trackCustom('Withdraw', {
      value: amount,
      currency: 'BRL',
      user_country: location.country,
      user_region: location.region,
      user_city: location.city,
      user_ip: location.ip,
      location_available: !!(location.country || location.region || location.city)
    });
  } else {
    console.log('🔴 Facebook Pixel: trackWithdraw - Pixel não encontrado');
  }
};

export const trackRefundRequest = async (amount: number): Promise<void> => {
  console.log('💰 Facebook Pixel: trackRefundRequest chamado', { amount });
  
  // Obter geolocalização do usuário
  const location = await getUserLocation();
  console.log('🌍 Facebook Pixel: Localização para reembolso obtida', location);
  
  const pixel = getFacebookPixel();
  if (pixel) {
    pixel.trackCustom('RefundRequest', {
      value: amount,
      currency: 'BRL',
      user_country: location.country,
      user_region: location.region,
      user_city: location.city,
      user_ip: location.ip,
      location_available: !!(location.country || location.region || location.city)
    });
  } else {
    console.log('🔴 Facebook Pixel: trackRefundRequest - Pixel não encontrado');
  }
};

export const trackSupportContact = async (): Promise<void> => {
  console.log('📞 Facebook Pixel: trackSupportContact chamado');
  
  // Obter geolocalização do usuário
  const location = await getUserLocation();
  console.log('🌍 Facebook Pixel: Localização para contato obtida', location);
  
  const pixel = getFacebookPixel();
  if (pixel) {
    pixel.trackContact('Support Chat');
    
    // Evento customizado com dados de geolocalização
    pixel.trackCustom('SupportContact', {
      content_name: 'Support Chat',
      user_country: location.country,
      user_region: location.region,
      user_city: location.city,
      user_ip: location.ip,
      location_available: !!(location.country || location.region || location.city)
    });
  } else {
    console.log('🔴 Facebook Pixel: trackSupportContact - Pixel não encontrado');
  }
};

export const pageView = (): void => {
  console.log('📄 Facebook Pixel: pageView chamado');
  const pixel = getFacebookPixel();
  if (pixel) {
    pixel.trackPageView();
  } else {
    console.log('🔴 Facebook Pixel: pageView - Pixel não encontrado');
  }
};

export default FacebookPixel;