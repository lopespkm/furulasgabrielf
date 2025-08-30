import { useRouter } from 'next/router';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Poppins } from 'next/font/google';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Loader2, Play, RotateCcw } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import Winners from '@/components/winners';
import { toast } from 'sonner';
import { apiUrl } from '@/lib/api';

const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ["100", "200", "300","400","500", "600", "700"],
});

// Interfaces para a API
interface Prize {
  id: string;
  scratchCardId: string;
  name: string;
  description: string;
  type: string;
  value: string;
  product_name: string | null;
  redemption_value: string | null;
  image_url: string;
  probability: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ScratchCardData {
  id: string;
  name: string;
  description: string;
  price: string;
  image_url: string;
  is_active: boolean;
  target_rtp: string;
  current_rtp: string;
  total_revenue: string;
  total_payouts: string;
  total_games_played: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  prizes: Prize[];
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: ScratchCardData;
}

interface GamePrize {
  id: string;
  name: string;
  type: string;
  value: string;
  product_name: string | null;
  redemption_value: string | null;
  image_url: string;
}

interface GameResult {
  isWinner: boolean;
  amountWon: string;
  prize: GamePrize | null;
  scratchCard: {
    id: string;
    name: string;
    price: string;
    image_url: string;
  };
}

interface GameData {
  id: string;
  userId: string;
  scratchCardId: string;
  prizeId: string | null;
  is_winner: boolean;
  amount_won: string;
  prize_type: string | null;
  redemption_choice: boolean;
  status: string;
  played_at: string;
  created_at: string;
  updated_at: string;
  scratchCard: {
    id: string;
    name: string;
    price: string;
    image_url: string;
  };
  prize: GamePrize | null;
}

interface PlayGameResponse {
  success: boolean;
  message: string;
  data: {
    game: GameData;
    result: GameResult;
  };
}

// Item da roleta
interface RouletteItem {
  id: string;
  name: string;
  image: string;
  value: string;
  type: string;
  isWinning?: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Estados do jogo
type GameState = 'idle' | 'loading' | 'spinning' | 'completed';

const RouletteBoxPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, token, updateUser } = useAuth();
  const isAuthenticated = !!user;
  const { width, height } = useWindowSize();

  // Estados da API
  const [scratchCardData, setScratchCardData] = useState<ScratchCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados do jogo da roleta
  const [gameState, setGameState] = useState<GameState>('idle');
  const [rouletteItems, setRouletteItems] = useState<RouletteItem[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [totalWinnings, setTotalWinnings] = useState(0);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [playingGame, setPlayingGame] = useState(false);
  const [winningItem, setWinningItem] = useState<RouletteItem | null>(null);
  
  // Estados específicos da roleta
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinDuration, setSpinDuration] = useState(0);
  const [finalRotation, setFinalRotation] = useState(0);

  // Função para corrigir URLs das imagens
  const fixImageUrl = (url: string) => {
    if (!url) return '';
    return url
      .replace('raspa.ae', 'api.raspapixoficial.com')
      .replace('/uploads/scratchcards/', '/uploads/')
      .replace('/uploads/prizes/', '/uploads/');
  };

  // Função para buscar dados da raspadinha
  const fetchScratchCardData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await fetch(apiUrl(`/v1/api/scratchcards/${id}`));
      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setScratchCardData(data.data);
      } else {
        setError('Box não encontrada');
      }
    } catch (err) {
      setError('Erro ao carregar box');
      console.error('Erro ao buscar box:', err);
    } finally {
      setLoading(false);
    }
  };

  // Buscar dados quando o ID estiver disponível
  useEffect(() => {
    if (id) {
      fetchScratchCardData();
    }
  }, [id]);

  // Função para determinar raridade baseada no valor
  const getRarityFromValue = (value: number): 'common' | 'rare' | 'epic' | 'legendary' => {
    if (value >= 1000) return 'legendary';
    if (value >= 100) return 'epic';
    if (value >= 10) return 'rare';
    return 'common';
  };

  // Função para gerar itens da roleta baseada nos prêmios disponíveis
  const generateRouletteItems = (prizes: Prize[]): RouletteItem[] => {
    const items: RouletteItem[] = [];
    
    // Adicionar cada prêmio múltiplas vezes baseado na raridade
    prizes.forEach((prize, index) => {
      const value = parseFloat(prize.value || prize.redemption_value || '0');
      const rarity = getRarityFromValue(value);
      
      // Quantidade de repetições baseada na raridade (mais comum = mais repetições)
      let repetitions = 1;
      switch (rarity) {
        case 'common': repetitions = 8; break;
        case 'rare': repetitions = 4; break;
        case 'epic': repetitions = 2; break;
        case 'legendary': repetitions = 1; break;
      }

      for (let i = 0; i < repetitions; i++) {
        items.push({
          id: `${prize.id}-${i}`,
          name: prize.type === 'MONEY' ? prize.name : prize.product_name || prize.name,
          image: fixImageUrl(prize.image_url) || '/50_money.webp',
          value: prize.type === 'MONEY' ? prize.value : prize.redemption_value || '0',
          type: prize.type,
          rarity
        });
      }
    });

    // Embaralhar os itens
    return items.sort(() => Math.random() - 0.5);
  };

  // Função para jogar na API
  const playGame = async (authToken: string): Promise<{ result: GameResult | null, errorMessage?: string }> => {
    if (!id || !authToken) return { result: null, errorMessage: "Dados de autenticação ausentes." };
    
    try {
      setPlayingGame(true);
      const response = await fetch(apiUrl('/v1/api/scratchcards/play'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
        body: JSON.stringify({
          scratchCardId: id
        })
      });
      
      const data: PlayGameResponse = await response.json();
      if (data.success) {
        return { result: data.data.result };
      } else {
        console.error('Erro ao jogar:', data.message);
        return { result: null, errorMessage: data.message };
      }
    } catch (error) {
      console.error('Erro na requisição de jogo:', error);
      return { result: null, errorMessage: 'Erro de conexão com o servidor.' };
    } finally {
      setPlayingGame(false);
    }
  };

  // Função para atualizar saldos do usuário
  const refreshUserBalance = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(apiUrl('/v1/api/users/profile'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        updateUser(data.data);
      }
    } catch (error) {
      console.error('Erro ao atualizar saldo do usuário:', error);
    }
  };

  // Função para iniciar a roleta
  const handleOpenBox = async () => {
    if (!isAuthenticated || playingGame || !scratchCardData) return;

    setGameState('loading');
    setShowConfetti(false);
    setHasWon(false);
    setTotalWinnings(0);
    setGameResult(null);
    setWinningItem(null);

    // Jogar na API
    const { result, errorMessage } = await playGame(token || '');
    
    console.log('Resultado do jogo:', result);
    
    if (result && typeof result === 'object') {
      setGameResult(result);
      
      // Gerar itens da roleta
      const items = generateRouletteItems(scratchCardData.prizes);
      setRouletteItems(items);
      
      // Determinar item vencedor
      let targetItem: RouletteItem | null = null;
      
      if (result.isWinner && result.prize) {
        // Encontrar um item correspondente ao prêmio ganho
        targetItem = items.find(item => 
          item.type === result.prize?.type && 
          parseFloat(item.value) === parseFloat(result.prize?.value || result.prize?.redemption_value || '0')
        ) || null;
        
        if (targetItem) {
          targetItem.isWinning = true;
          setWinningItem(targetItem);
        }
      } else {
        // Para não vencedores, escolher um item aleatório de menor valor
        const commonItems = items.filter(item => item.rarity === 'common');
        targetItem = commonItems[Math.floor(Math.random() * commonItems.length)] || items[0];
      }
      
      setGameState('spinning');
      startRouletteSpin(targetItem, items);
    } else {
      setGameState('idle');
      toast.error(errorMessage || 'Erro ao abrir a box. Tente novamente.');
    }
  };

  // Função para iniciar a animação da roleta
  const startRouletteSpin = (targetItem: RouletteItem | null, items: RouletteItem[]) => {
    if (!targetItem || items.length === 0) return;

    setIsSpinning(true);
    
    // Encontrar o índice do item alvo
    const targetIndex = items.findIndex(item => item.id === targetItem.id);
    const itemWidth = 120; // Largura de cada item
    const containerWidth = 500; // Largura do container visível
    const totalWidth = items.length * itemWidth;
    
    // Calcular posição final (centralizar o item alvo)
    const finalPosition = (targetIndex * itemWidth) - (containerWidth / 2) + (itemWidth / 2);
    
    // Adicionar várias voltas completas + posição final
    const fullRotations = 3; // 3 voltas completas
    const finalRotation = (fullRotations * totalWidth) + finalPosition;
    
    setFinalRotation(finalRotation);
    
    // Duração da animação
    const duration = 4000; // 4 segundos
    setSpinDuration(duration);
    
    // Finalizar após a animação
    setTimeout(() => {
      setIsSpinning(false);
      setGameState('completed');
      
      if (gameResult?.isWinner) {
        setHasWon(true);
        setTotalWinnings(parseFloat(gameResult.amountWon));
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
      
      refreshUserBalance();
    }, duration);
  };

  // Função para jogar novamente
  const handlePlayAgain = async () => {
    if (!isAuthenticated || playingGame || !scratchCardData) return;

    // Reset states
    setRouletteItems([]);
    setShowConfetti(false);
    setHasWon(false);
    setTotalWinnings(0);
    setGameResult(null);
    setWinningItem(null);
    setIsSpinning(false);
    setFinalRotation(0);
    
    // Start new game
    await handleOpenBox();
  };

  // Função para obter cor da raridade
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-500 to-yellow-600 border-yellow-400';
      case 'epic': return 'from-purple-500 to-purple-600 border-purple-400';
      case 'rare': return 'from-blue-500 to-blue-600 border-blue-400';
      default: return 'from-gray-500 to-gray-600 border-gray-400';
    }
  };

  return (
    <div className={`${poppins.className} min-h-screen bg-neutral-900`}>
      <Header />
      
      {/* Confetti */}
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={300}
          gravity={0.3}
        />
      )}
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Winners */}
        <Winners />

        {/* Game Area */}
        <div className="mt-4 bg-neutral-800 rounded-xl border border-neutral-700 p-4 sm:p-6 mb-6 sm:mb-8">
          {/* Header */}
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              {scratchCardData?.name || '...'} - Roleta
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm px-2">
              Gire a roleta e ganhe prêmios incríveis!
            </p>
          </div>

          {/* Game States */}
          {gameState === 'idle' && (
            <div className="bg-neutral-700 rounded-lg p-3 sm:p-6 border border-neutral-600 mb-4 sm:mb-6">
              <div className="relative w-64 h-64 sm:w-96 sm:h-96 lg:w-[32rem] lg:h-[32rem] xl:w-[36rem] xl:h-[36rem] rounded-lg overflow-hidden mx-auto bg-gradient-to-br from-neutral-600 to-neutral-800 border-2 border-yellow-500/30 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mb-4 mx-auto border-4 border-yellow-400/50">
                    <Play className="w-12 h-12 sm:w-16 sm:h-16 text-white ml-1" />
                  </div>
                  <h3 className="text-white font-bold text-lg sm:text-2xl mb-2">
                    Box Misteriosa
                  </h3>
                  <p className="text-yellow-400 text-sm sm:text-base">
                    Clique para girar a roleta!
                  </p>
                </div>
                
                {!isAuthenticated && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                    <div className="text-center px-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br rounded-xl from-neutral-700 to-neutral-800 border border-neutral-600 flex items-center justify-center mb-3 sm:mb-4 mx-auto">
                        <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-neutral-300" />
                      </div>
                      <h3 className="text-white font-bold text-base sm:text-lg mb-2">
                        Faça login para jogar
                      </h3>
                      <p className="text-neutral-400 text-xs sm:text-sm mb-4">
                        Conecte-se para abrir a box
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-center mt-3 sm:mt-4">
                <h3 className="text-white font-bold text-lg sm:text-xl mb-2">
                  Gire a roleta e ganhe prêmios incríveis!
                </h3>
                <p className="text-neutral-400 text-xs sm:text-sm mb-3 sm:mb-4 px-2">
                  Cada giro pode render prêmios em dinheiro ou produtos exclusivos.<br />
                  A sorte está em suas mãos!
                </p>
                <Button 
                  onClick={handleOpenBox}
                  disabled={!isAuthenticated || !scratchCardData}
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:from-neutral-600 disabled:to-neutral-700 text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-xl w-full lg:w-1/2 transition-all duration-300 shadow-lg hover:shadow-xl border border-yellow-400/20 disabled:border-neutral-600/20"
                >
                  {!isAuthenticated ? 'Faça login para jogar' : scratchCardData ? `Abrir Box (R$ ${parseFloat(scratchCardData.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : 'Carregando...'}
                </Button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {gameState === 'loading' && (
            <div className="bg-neutral-700 rounded-lg p-6 sm:p-8 border border-neutral-600 mb-4 sm:mb-6">
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
                  <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-spin" />
                </div>
                <h3 className="text-white font-bold text-lg sm:text-xl mb-2">
                  Preparando a roleta...
                </h3>
                <p className="text-neutral-400 text-sm">
                  Aguarde enquanto carregamos os prêmios
                </p>
              </div>
            </div>
          )}

          {/* Spinning/Completed State - Roulette */}
          {(gameState === 'spinning' || gameState === 'completed') && (
            <div className="bg-neutral-700 rounded-lg p-4 sm:p-6 border border-neutral-600 mb-4 sm:mb-6">
              {gameState === 'spinning' && (
                <div className="text-center mb-4">
                  <p className="text-white font-semibold text-sm sm:text-base mb-2">
                    A roleta está girando...
                  </p>
                  <p className="text-yellow-400 text-xs sm:text-sm">
                    Aguarde o resultado!
                  </p>
                </div>
              )}
              
              {/* Roulette Container */}
              <div className="relative w-full max-w-lg mx-auto mb-6">
                {/* Pointer */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                  <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-b-[20px] border-b-yellow-500 drop-shadow-lg"></div>
                </div>
                
                {/* Roulette Track */}
                <div className="relative h-24 bg-neutral-800 rounded-lg border-2 border-neutral-600 overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full flex transition-transform ease-out"
                    style={{
                      transform: `translateX(-${finalRotation}px)`,
                      transitionDuration: isSpinning ? `${spinDuration}ms` : '0ms',
                      transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                    }}
                  >
                    {rouletteItems.map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className={`flex-shrink-0 w-[120px] h-full flex flex-col items-center justify-center p-2 border-r border-neutral-600 bg-gradient-to-br ${getRarityColor(item.rarity)} ${item.isWinning ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''}`}
                      >
                        <div className="w-8 h-8 relative mb-1">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/50_money.webp';
                            }}
                          />
                        </div>
                        <p className="text-white text-xs font-bold text-center leading-tight">
                          {item.type === 'MONEY' ? `R$ ${parseFloat(item.value).toFixed(0)}` : item.name.substring(0, 8)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {gameState === 'completed' && (
                <div className="text-center">
                  {hasWon ? (
                    <div>
                      <h3 className="text-green-400 font-bold text-lg sm:text-xl mb-2">
                        Parabéns! Você ganhou!
                      </h3>
                      {gameResult?.prize?.type === 'PRODUCT' ? (
                        <p className="text-white font-semibold text-base sm:text-lg">
                          {gameResult.prize.product_name || gameResult.prize.name}
                        </p>
                      ) : (
                        <p className="text-white font-semibold text-base sm:text-lg">
                          Total: R$ {totalWinnings.toFixed(2).replace('.', ',')}
                        </p>
                      )}
                      <p className="text-neutral-400 text-xs sm:text-sm mt-1">
                        A sorte estava ao seu lado!
                      </p>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-yellow-400 font-bold text-lg sm:text-xl mb-2">
                        Ops! Não foi dessa vez!
                      </h3>
                      <p className="text-neutral-400 text-sm">
                        Continue tentando, a sorte pode mudar!
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-4">
                    {hasWon && gameResult?.prize?.type === 'PRODUCT' ? (
                      <Button 
                        onClick={() => router.push('/v1/profile/inventory')}
                        className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-2 px-6 rounded-lg w-full transition-all duration-300 shadow-lg hover:shadow-xl border border-purple-400/20 text-sm"
                      >
                        Ir para Inventário
                      </Button>
                    ) : (
                      <Button 
                        onClick={handlePlayAgain}
                        disabled={!isAuthenticated || !scratchCardData}
                        className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:from-neutral-600 disabled:to-neutral-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300 disabled:cursor-not-allowed"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {scratchCardData ? `Girar Novamente (R$ ${parseFloat(scratchCardData.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : 'Carregando...'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Prize Section */}
        <div className="rounded-xl">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 text-start">
            Prêmios Disponíveis
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
            {scratchCardData?.prizes && scratchCardData.prizes.length > 0 ? (
              scratchCardData.prizes
                .sort((a, b) => {
                  const valueA = parseFloat(a.type === 'MONEY' ? a.value || '0' : a.redemption_value || '0');
                  const valueB = parseFloat(b.type === 'MONEY' ? b.value || '0' : b.redemption_value || '0');
                  return valueA - valueB;
                })
                .slice(0, 20)
                .map((prize, index) => {
                  const value = parseFloat(prize.type === 'MONEY' ? prize.value || '0' : prize.redemption_value || '0');
                  const rarity = getRarityFromValue(value);
                  
                  return (
                    <div key={prize.id} className="flex-shrink-0 w-38 xl:w-auto">
                      <div className={`relative flex flex-col border-2 p-3 rounded-lg bg-gradient-to-t cursor-pointer aspect-square hover:scale-105 transition-all duration-300 ${getRarityColor(rarity)}`}>
                        <Image
                          src={fixImageUrl(prize.image_url)}
                          alt={prize.type === 'MONEY' ? `${parseFloat(prize.value || '0').toFixed(0)} Reais` : prize.name}
                          width={80}
                          height={80}
                          className="size-full p-3 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/50_money.webp';
                          }}
                        />
                        <h3 className="text-sm font-semibold mb-3 overflow-hidden text-ellipsis text-nowrap w-30 text-white">
                          {prize.type === 'MONEY' ? prize.name : prize.product_name}
                        </h3>
                        <div className="px-1.5 py-1 bg-white text-neutral-900 rounded-sm text-sm font-semibold self-start">
                          R$ {prize.type === 'MONEY' ? parseFloat(prize.value || '0').toFixed(2).replace('.', ',') : parseFloat(prize.redemption_value || '0').toFixed(2).replace('.', ',')}
                        </div>
                        
                        {/* Indicador de raridade */}
                        <div className="absolute top-1 right-1">
                          <div className={`w-3 h-3 rounded-full ${
                            rarity === 'legendary' ? 'bg-yellow-400' :
                            rarity === 'epic' ? 'bg-purple-400' :
                            rarity === 'rare' ? 'bg-blue-400' :
                            'bg-gray-400'
                          }`}></div>
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-neutral-400 text-sm">Nenhum prêmio disponível</p>
              </div>
            )}
          </div>
          
          {/* Legenda de raridades */}
          <div className="mt-6 bg-neutral-800 rounded-lg p-4 border border-neutral-700">
            <h3 className="text-white font-semibold text-sm mb-3">Legendas de Raridade</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                <span className="text-neutral-300 text-xs">Comum</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-400"></div>
                <span className="text-neutral-300 text-xs">Raro</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-400"></div>
                <span className="text-neutral-300 text-xs">Épico</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-400"></div>
                <span className="text-neutral-300 text-xs">Lendário</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default RouletteBoxPage;