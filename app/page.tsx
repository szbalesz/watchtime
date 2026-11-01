'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { TrophyIcon } from 'lucide-react';

interface UserData {
  watchtime: number;
  points: number;
  pointsAlltime: number;
  rank: number;
}

interface FollowStat {
  channelName: string;
  channelLogin: string;
  avatar: string;
  watchtime: number;
  points: number;
  pointsAlltime: number;
  rank: number;
}

function WatchtimeContent() {
  const { data: session, status } = useSession();
  const params = useParams();

  const [channelInput, setChannelInput] = useState('');
  const [userInput, setUserInput] = useState('');

  const [channelData, setChannelData] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [rateText, setRateText] = useState<string>('');

  const [channelLoading, setChannelLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);

  const [channelError, setChannelError] = useState('');
  const [userError, setUserError] = useState('');

  const [timeFormat, setTimeFormat] = useState<'formatted' | 'minutes'>('formatted');
  const [leaderboardTimeFormat, setLeaderboardTimeFormat] = useState<'formatted' | 'minutes'>('formatted');

  const [leaderboardStats, setLeaderboardStats] = useState<FollowStat[]>([]);
  const [totalFollows, setTotalFollows] = useState<number>(0);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');

  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);
  const userInputRef = useRef<HTMLInputElement>(null);

  const isDiscordActivity = typeof window !== 'undefined' && window.location.hostname.includes('discordsays.com');

  const totalLeaderboardWatchtime = leaderboardStats.reduce((sum, item) => sum + (item.watchtime || 0), 0);

  useEffect(() => {
    if (session && (session as any).error === "RefreshAccessTokenError") {
      signOut();
    }
  }, [session]);

  const formatNumber = (num: number) => new Intl.NumberFormat('hu-HU').format(num || 0);

  const formatTime = (totalMinutes: number, isOnlyMinutes = false) => {
    if (typeof totalMinutes !== 'number' || isNaN(totalMinutes)) return '0 perc';
    if (isOnlyMinutes) return `${formatNumber(totalMinutes)} perc`;

    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} nap`);
    if (hours > 0) parts.push(`${hours} óra`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes} perc`);
    return parts.join(' ');
  };

  const getExactUsername = () => {
    const uName = session?.user?.username || session?.user?.name || '';
    return uName.toLowerCase().trim();
  };

  const getFormattedHeaderName = () => {
    const dName = session?.user?.displayName || session?.user?.name;
    const uName = session?.user?.username;

    if (dName && uName && dName.toLowerCase() !== uName.toLowerCase()) {
      return `${dName} (${uName})`;
    }
    return dName || uName || '';
  };

  const updateURL = (channel?: string | null, user?: string | null) => {
    let newPath = '/';
    if (channel) {
      newPath += channel;
      if (user) {
        newPath += `/${user}`;
      }
    }
    if (typeof window !== 'undefined' && window.location.pathname !== newPath) {
      window.history.replaceState({}, '', newPath);
    }
  };

  useEffect(() => {
    if (channelData && userData && userInput) {
      document.title = `${userInput} @ ${channelData.name} | SE Watchtime`;
    } else if (channelData) {
      document.title = `${channelData.name} | SE Watchtime`;
    } else {
      document.title = 'StreamElements Watchtime Panel';
    }
  }, [channelData, userData, userInput]);

  useEffect(() => {
    if (!isDiscordActivity && status === 'authenticated') {
      setLeaderboardLoading(true);
      fetch('/api/user-follows-stats')
        .then((res) => {
          if (res.status === 401) {
            signOut();
            throw new Error('A munkamenet lejárt. Kérlek, jelentkezz be újra.');
          }
          if (!res.ok) throw new Error('Nem sikerült betölteni a ranglistát.');
          return res.json();
        })
        .then((data) => {
          setLeaderboardStats(data.stats || []);
          setTotalFollows(data.totalFollows || data.stats?.length || 0);
        })
        .catch((err) => setLeaderboardError(err.message))
        .finally(() => setLeaderboardLoading(false));
    }
  }, [status, isDiscordActivity]);

  useEffect(() => {
    if (hasInitialLoaded) return;

    const slug = params?.slug as string[] | undefined;
    if (slug && slug.length > 0) {
      const ch = slug[0];
      const u = slug[1] || (session ? getExactUsername() : '');

      setChannelInput(ch);

      fetch(`/api/proxy/streamelements/channels/${ch.toLowerCase()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data._id) {
            const realCh = {
              id: data._id,
              name: data.displayName || data.username || ch,
              avatar: data.avatar || 'https://cdn.streamelements.com/static/user/profile_header_default.png',
            };
            setChannelData(realCh);

            if (u) {
              setUserInput(u);
              executeUserSearch(realCh.id, u, ch, false);
            }
          }
        })
        .finally(() => setHasInitialLoaded(true));
    } else {
      setHasInitialLoaded(true);
    }
  }, [params, session, hasInitialLoaded]);

  const handleSearchChannel = async (targetChannel?: string) => {
    const input = (targetChannel || channelInput).trim().toLowerCase();
    if (!input) return null;

    setChannelError('');
    setChannelLoading(true);

    try {
      const res = await fetch(`/api/proxy/streamelements/channels/${input}`);
      if (!res.ok) throw new Error('A csatorna nem található.');

      const data = await res.json();
      const realChannel = {
        id: data._id,
        name: data.displayName || data.username || input,
        avatar: data.avatar || 'https://cdn.streamelements.com/static/user/profile_header_default.png',
      };
      setChannelData(realChannel);

      if (!userInput) {
        updateURL(input);
      }

      if (session && !userInput) {
        setUserInput(getExactUsername());
      }

      setTimeout(() => {
        userInputRef.current?.focus();
      }, 100);

      return realChannel;
    } catch (err: unknown) {
      setChannelError((err as Error).message);
      return null;
    } finally {
      setChannelLoading(false);
    }
  };

  const executeUserSearch = async (chId: string, uName: string, chName: string, shouldUpdateUrl = true) => {
    setUserError('');
    setUserLoading(true);
    setRateText('');

    try {
      const [pointsRes, loyaltyRes] = await Promise.all([
        fetch(`/api/proxy/streamelements/points/${chId}/${uName}`),
        fetch(`/api/loyalty?channelId=${chId}`).catch(() => null),
      ]);

      if (!pointsRes.ok) throw new Error('Nem található adat ehhez a nézőhöz.');

      const data = await pointsRes.json();
      setUserData(data);

      if (loyaltyRes && loyaltyRes.ok) {
        const rawData = await loyaltyRes.json();
        const l = rawData.loyalty || rawData;

        if (l && l.enabled !== false) {
          const amount = l.amount || 0;
          const interval = l.interval || 0;
          const subMult = l.subscriberMultiplier || 0;

          let txt = `⚡ +${amount} pont / ${interval} perc`;
          if (subMult > 1) txt += ` (${subMult}x sub szorzó)`;
          setRateText(txt);
        } else {
          setRateText('⚠️ A pontgyűjtés ki van kapcsolva');
        }
      }

      if (shouldUpdateUrl) {
        updateURL(chName, uName);
      }
    } catch (err: unknown) {
      setUserError((err as Error).message);
      setUserData(null);
    } finally {
      setUserLoading(false);
    }
  };

  const handleSearchUser = async () => {
    if (!channelData) return;
    const input = userInput.trim().toLowerCase();
    if (!input) return;

    await executeUserSearch(channelData.id, input, channelInput || channelData.name);
  };

  const handleReset = () => {
    setChannelData(null);
    setUserData(null);
    setChannelInput('');
    setUserInput('');
    setChannelError('');
    setUserError('');
    setRateText('');
    updateURL(null);
  };

  return (
    <div className="w-full min-h-screen lg:h-screen flex flex-col bg-[#030712] lg:overflow-hidden">

      {/* NAVBAR (Csak akkor jelenik meg, ha NEM Discord Activity-ben vagyunk) */}
      {!isDiscordActivity && (
        <header className="sticky top-0 z-50 w-full bg-[#030712]/80 backdrop-blur-md border-b border-[#1f2937]/80 shrink-0">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#9146FF]/10 border border-[#9146FF]/30 flex items-center justify-center shadow-lg shadow-[#9146FF]/10 shrink-0">
                <span className="text-[#9146FF] text-lg sm:text-xl font-black">⚡</span>
              </div>
              <h1 className="text-[12px] sm:text-sm md:text-base font-black text-white tracking-wide truncate">
                StreamElements Watchtime
              </h1>
            </div>

            {status === 'loading' && (
              <div className="w-24 sm:w-32 h-8 bg-[#111827] animate-pulse rounded-xl border border-[#1f2937]"></div>
            )}

            {status === 'authenticated' && session && (
              <div className="flex items-center gap-1.5 sm:gap-3 bg-[#111827] border border-[#1f2937] p-1.5 sm:pl-2.5 rounded-2xl shadow-md shrink-0">
                <div className="flex items-center gap-2">
                  {session.user?.image ? (
                    <img src={`/api/proxy/image?url=${encodeURIComponent(session.user.image)}`} alt="Avatar" className="w-6 h-6 rounded-full border border-[#9146FF] object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#9146FF] flex items-center justify-center text-white font-bold text-[10px]">
                      {session.user?.name?.[0]}
                    </div>
                  )}
                  <span className="text-[11px] sm:text-xs font-semibold text-white hidden sm:inline">
                    {getFormattedHeaderName()}
                  </span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="bg-[#1f2937] hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 border border-transparent text-gray-400 font-semibold text-[10px] sm:text-[11px] py-1 px-2 sm:px-2.5 rounded-xl transition duration-200"
                  title="Kijelentkezés"
                >
                  Kijelentkezés
                </button>
              </div>
            )}
          </div>
        </header>
      )}

      {/* FŐ TARTALOM: Discordon belül teljesen középre igazítva (vízszintesen és függőlegesen is) */}
      <main className={`flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 flex flex-col lg:min-h-0 lg:overflow-y-auto lg:overflow-hidden ${isDiscordActivity ? 'items-center justify-center' : ''}`}>
        <div className={`grid grid-cols-1 ${isDiscordActivity ? 'lg:grid-cols-12 max-w-lg mx-auto w-full' : 'lg:grid-cols-12'} gap-4 sm:gap-6 items-start lg:h-full lg:min-h-0`}>

          <div className={`${isDiscordActivity ? 'lg:col-span-12' : 'lg:col-span-6'} w-full h-fit bg-[#111827] border border-[#1f2937] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-5 transition-all duration-300`}>
            <div className="flex flex-col gap-5">

              {!channelData && (
                <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <label className="text-xs font-semibold text-gray-400">Twitch Csatorna Neve</label>
                  <input
                    type="text"
                    value={channelInput}
                    onChange={(e) => setChannelInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchChannel()}
                    placeholder="pl. csatornanév"
                    className="w-full bg-[#030712] border border-[#1f2937] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#9146FF] transition"
                  />
                  <button
                    onClick={() => handleSearchChannel()}
                    disabled={channelLoading}
                    className="w-full bg-[#9146FF] hover:bg-[#a970ff] text-white font-semibold py-3 rounded-xl transition duration-200 active:scale-95 text-sm"
                  >
                    {channelLoading ? 'Keresés...' : 'Csatorna Keresése'}
                  </button>
                  {channelError && <p className="text-red-400 text-xs text-center">{channelError}</p>}
                </div>
              )}

              {channelData && (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-[#030712] border border-[#3e1f72] rounded-2xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={`/api/proxy/image?url=${encodeURIComponent(channelData.avatar)}`} alt="Avatar" className="w-10 h-10 rounded-full border border-[#9146FF] object-cover" />
                      <div>
                        <h2 className="text-sm font-bold text-white">{channelData.name}</h2>
                        <p className="text-[11px] text-gray-400">Kiválasztott csatorna</p>
                      </div>
                    </div>
                    <button onClick={handleReset} className="text-gray-400 hover:text-white p-2 text-sm transition">✕</button>
                  </div>

                  {/* Streamelements és Lurkology gombok: CSAK sima weboldalon jelennek meg */}
                  {!isDiscordActivity && (
                    <div className="grid grid-cols-2 gap-3">
                      <a
                        href={`https://streamelements.com/${channelInput || channelData.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center bg-[#030712] border border-[#1f2937] hover:border-[#9146FF] rounded-xl p-2.5 text-gray-400 hover:text-white transition duration-200 group"
                      >
                        <svg className="w-4 h-4 mb-1 text-gray-500 group-hover:text-[#9146FF] transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span className="text-[10px] font-bold tracking-wider uppercase">StreamElements</span>
                      </a>

                      <a
                        href={`https://lurkology.com/${channelInput || channelData.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center bg-[#030712] border border-[#1f2937] hover:border-[#9146FF] rounded-xl p-2.5 text-gray-400 hover:text-white transition duration-200 group"
                      >
                        <svg className="w-4 h-4 mb-1 text-gray-500 group-hover:text-[#9146FF] transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="text-[10px] font-bold tracking-wider uppercase">Lurkology</span>
                      </a>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-400">Néző Felhasználóneve</label>
                    <input
                      ref={userInputRef}
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                      placeholder="pl. felhasználónév"
                      className="w-full bg-[#030712] border border-[#1f2937] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#9146FF] transition"
                    />
                    <button
                      onClick={handleSearchUser}
                      disabled={userLoading}
                      className="w-full bg-[#1f2937] hover:bg-[#374151] text-white font-semibold py-3 rounded-xl transition duration-200 active:scale-95 text-sm"
                    >
                      {userLoading ? 'Lekérdezés...' : 'Adatok Lekérdezése'}
                    </button>
                    {userError && <p className="text-red-400 text-xs text-center">{userError}</p>}
                  </div>
                </div>
              )}

              {userLoading && (
                <div className="flex flex-col gap-3 animate-pulse pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#030712] h-20 rounded-2xl border border-[#1f2937]"></div>
                    <div className="bg-[#030712] h-20 rounded-2xl border border-[#1f2937]"></div>
                    <div className="col-span-2 bg-[#030712] h-24 rounded-2xl border border-[#1f2937]"></div>
                  </div>
                </div>
              )}

              {!userLoading && userData && (
                <div className="flex flex-col gap-4 border-t border-[#1f2937] pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

                  <div className="flex bg-[#030712] border border-[#1f2937] p-1 rounded-xl text-xs font-semibold text-center">
                    <button
                      onClick={() => setTimeFormat('formatted')}
                      className={`flex-1 py-1.5 rounded-lg transition ${timeFormat === 'formatted' ? 'bg-[#374151] text-white' : 'text-gray-400'}`}
                    >
                      Nap / Óra
                    </button>
                    <button
                      onClick={() => setTimeFormat('minutes')}
                      className={`flex-1 py-1.5 rounded-lg transition ${timeFormat === 'minutes' ? 'bg-[#374151] text-white' : 'text-gray-400'}`}
                    >
                      Csak Perc
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Rang / Helyezés: Discordon sima kártya (nem link), weboldalon kattintható link */}
                    {isDiscordActivity ? (
                      <div className="bg-[#030712] border border-[#1f2937] p-3.5 rounded-2xl text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Rang / Helyezés</p>
                        <p className="text-xl font-black text-white mt-1">#{formatNumber(userData.rank || 0)}</p>
                      </div>
                    ) : (
                      <a
                        href={`https://streamelements.com/${channelInput || channelData?.name}/leaderboard`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#030712] border border-[#1f2937] hover:border-[#9146FF] p-3.5 rounded-2xl text-center transition group"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 group-hover:text-[#9146FF] transition">Rang / Helyezés</p>
                          <svg className="w-3 h-3 text-gray-500 group-hover:text-[#9146FF] transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                        <p className="text-xl font-black text-white mt-1">#{formatNumber(userData.rank || 0)}</p>
                      </a>
                    )}

                    <div className="bg-[#030712] border border-[#1f2937] p-3.5 rounded-2xl text-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-[#9146FF]" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#9146FF]">Nézési Idő</p>
                      <p className="text-sm font-extrabold text-white mt-1">{formatTime(userData.watchtime || 0, timeFormat === 'minutes')}</p>
                    </div>

                    <div className="col-span-2 bg-[#030712] border border-[#1f2937] p-4 rounded-2xl flex flex-col gap-2">
                      <div className="flex justify-between items-start w-full">
                        <div className="text-left">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Összes Pont (All-time)</p>
                          <p className="text-lg font-black text-white">{formatNumber(userData.pointsAlltime || 0)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Jelenlegi pont</p>
                          <p className="text-base font-bold text-gray-300">{formatNumber(userData.points || 0)}</p>
                        </div>
                      </div>
                      {rateText && (
                        <div className="w-full text-center mt-1">
                          <p className="text-xs font-semibold text-[#a970ff]">{rateText}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#030712] border border-[#1f2937] rounded-2xl p-3.5 flex items-start gap-3 mt-1">
              <svg className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                <strong className="text-gray-300">Fontos:</strong> Ez az eszköz csak olyan csatornáknál mutat adatokat, ahol a StreamElements aktívan számolja a nézési időt és a pontokat.
              </p>
            </div>
          </div>

          {/* JOBB OSZLOP: RANGLISTA (Ez CSAK a sima weboldalon jelenik meg, Discordon nem!) */}
          {!isDiscordActivity && (
            <div className="lg:col-span-6 w-full h-[40rem] lg:h-full bg-[#111827] border border-[#1f2937] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden min-h-0">

              <div className="border-b border-[#1f2937] pb-4 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-2">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <TrophyIcon size={20} /> Követett Csatornák Ranglistája
                  </h2>
                  <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">Ahol a legtöbb időt töltötted a StreamElements szerint</p>

                  {session && !leaderboardLoading && !leaderboardError && leaderboardStats.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 bg-[#030712] border border-[#9146FF]/30 px-3 py-1.5 rounded-xl w-fit">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Összesen:</span>
                        <span className="text-xs font-black text-[#9146FF] drop-shadow-[0_0_8px_rgba(145,70,255,0.4)]">
                          {formatTime(totalLeaderboardWatchtime, leaderboardTimeFormat === 'minutes')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-[#030712] border border-[#1f2937] px-3 py-1.5 rounded-xl w-fit">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Statisztika:</span>
                        <span className="text-xs font-black text-gray-300">
                          {leaderboardStats.length} <span className="text-gray-500 font-medium">/ {totalFollows > 0 ? totalFollows : '?'} követett</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {session && !leaderboardLoading && !leaderboardError && leaderboardStats.length > 0 && (
                  <div className="flex bg-[#030712] border border-[#1f2937] p-1 rounded-xl text-[10px] font-semibold text-center shrink-0 w-full sm:w-auto">
                    <button
                      onClick={() => setLeaderboardTimeFormat('formatted')}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition ${leaderboardTimeFormat === 'formatted' ? 'bg-[#374151] text-white' : 'text-gray-400'}`}
                    >
                      Nap / Óra
                    </button>
                    <button
                      onClick={() => setLeaderboardTimeFormat('minutes')}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition ${leaderboardTimeFormat === 'minutes' ? 'bg-[#374151] text-white' : 'text-gray-400'}`}
                    >
                      Csak Perc
                    </button>
                  </div>
                )}
              </div>

              {!session && status !== 'loading' && (
                <div className="relative w-full flex-1 flex items-center justify-center min-h-0">
                  <div className="absolute inset-0 flex flex-col gap-3 opacity-30 blur-[3px] select-none pointer-events-none overflow-hidden">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                      <div key={i} className="bg-[#030712] border border-[#1f2937] rounded-2xl p-3 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 bg-gray-700 rounded"></div>
                          <div className="w-9 h-9 bg-gray-700 rounded-full"></div>
                          <div className="flex flex-col gap-1.5">
                            <div className="w-24 h-3 bg-gray-700 rounded"></div>
                            <div className="w-16 h-2 bg-gray-700 rounded"></div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="w-20 h-3 bg-gray-700 rounded"></div>
                          <div className="w-12 h-2 bg-gray-700 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="relative z-10 bg-[#030712]/90 border border-[#3e1f72] p-6 rounded-2xl max-w-sm text-center flex flex-col items-center gap-3 shadow-2xl backdrop-blur-md">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#9146FF]/20 border border-[#9146FF]/50 flex items-center justify-center text-[#9146FF] text-xl sm:text-2xl font-bold">
                      <TrophyIcon />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-white">Saját Ranglistád</h3>
                    <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed">
                      Jelentkezz be Twitch fiókoddal a követett csatornáid automatikus elemzéséhez és a watchtime ranglistád megtekintéséhez!
                    </p>
                    <button
                      onClick={() => signIn('twitch')}
                      className="w-full bg-[#9146FF] hover:bg-[#a970ff] text-white font-semibold py-2.5 px-4 rounded-xl transition duration-200 active:scale-95 text-xs shadow-lg shadow-[#9146FF]/25 mt-1"
                    >
                      Twitch Bejelentkezés
                    </button>
                    <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed">
                      <b>(Semmilyen adatot nem tárolunk!)</b>
                    </p>
                  </div>
                </div>
              )}

              {session && (
                <div className="flex-1 min-h-0 flex flex-col">
                  {leaderboardLoading && (
                    <div className="flex flex-col gap-3 animate-pulse overflow-hidden h-full">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                        <div key={i} className="bg-[#030712] border border-[#1f2937] rounded-2xl p-3 flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-gray-800 rounded"></div>
                            <div className="w-9 h-9 bg-gray-800 rounded-full"></div>
                            <div className="flex flex-col gap-1.5">
                              <div className="w-24 h-3.5 bg-gray-800 rounded"></div>
                              <div className="w-16 h-2.5 bg-gray-800 rounded"></div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="w-20 h-3.5 bg-gray-800 rounded"></div>
                            <div className="w-12 h-2.5 bg-gray-800 rounded"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {leaderboardError && <p className="text-red-400 text-xs text-center py-4">{leaderboardError}</p>}

                  {!leaderboardLoading && !leaderboardError && leaderboardStats.length === 0 && (
                    <p className="text-gray-400 text-xs text-center py-6">Nem található aktív nézési idő a követett csatornáidon.</p>
                  )}

                  {!leaderboardLoading && !leaderboardError && leaderboardStats.length > 0 && (
                    <div className="flex-1 overflow-y-auto pr-1.5 flex flex-col gap-2.5 scrollbar-thin scrollbar-thumb-gray-800">
                      {leaderboardStats.map((item, index) => (
                        <div
                          key={item.channelLogin}
                          onClick={() => {
                            const exactUser = getExactUsername();
                            setUserInput(exactUser);

                            setUserLoading(true);
                            fetch(`/api/proxy/streamelements/channels/${item.channelLogin}`)
                              .then(r => r.json())
                              .then(cData => {
                                const realCh = {
                                  id: cData._id,
                                  name: item.channelName,
                                  avatar: item.avatar,
                                };
                                setChannelData(realCh);
                                setChannelInput(item.channelLogin);

                                executeUserSearch(cData._id, exactUser, item.channelLogin);
                              });
                          }}
                          className="bg-[#030712] border border-[#1f2937] hover:border-[#9146FF]/50 rounded-2xl p-3 flex items-center justify-between gap-3 cursor-pointer transition duration-200 hover:translate-x-1 shrink-0"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-black w-5 ${index === 0 ? 'text-amber-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-[#9146FF]'}`}>
                              #{index + 1}
                            </span>
                            <img src={`/api/proxy/image?url=${encodeURIComponent(item.avatar)}`} alt={item.channelName} className="w-9 h-9 rounded-full border border-[#9146FF] object-cover" />
                            <div>
                              <h3 className="text-xs font-bold text-white">{item.channelName}</h3>
                              <p className="text-[10px] text-gray-400">Rang: #{formatNumber(item.rank)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-extrabold text-white">
                              {formatTime(item.watchtime, leaderboardTimeFormat === 'minutes')}
                            </p>
                            <p className="text-[10px] text-gray-400">{formatNumber(item.points)} pont</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="w-full h-screen bg-[#030712]"></div>}>
      <WatchtimeContent />
    </Suspense>
  );
}