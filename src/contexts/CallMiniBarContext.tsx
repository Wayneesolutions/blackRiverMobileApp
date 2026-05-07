import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type MiniBarConfig = {
  seconds: number;
  isMuted: boolean;
  callerLabel?: string;
  onEnd: () => void;
  onToggleMute: () => void;
  onExpand: () => void;
};

type CallMiniBarContextType = {
  showMiniBar: (config: MiniBarConfig) => void;
  updateMiniBar: (updates: Partial<MiniBarConfig>) => void;
  hideMiniBar: () => void;
};

const CallMiniBarContext = createContext<CallMiniBarContextType>({
  showMiniBar: () => {},
  updateMiniBar: () => {},
  hideMiniBar: () => {},
});

export const useCallMiniBar = () => useContext(CallMiniBarContext);

// Module-level setter — bypasses ALL closure chains so socket handlers
// (which capture stale function refs) can always hide the bar immediately.
const _imp: { hide: (() => void) | null } = { hide: null };
export const forceHideMiniBar = () => _imp.hide?.();

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function CallMiniBarProvider({ children }: { children: ReactNode }) {
  const [bar, setBar] = useState<MiniBarConfig | null>(null);

  // Keep the imperative escape hatch always pointing at the live setter.
  // setBar is stable (from useState) so this effectively runs once.
  useEffect(() => {
    _imp.hide = () => setBar(null);
    return () => { _imp.hide = null; };
  }, []);

  const showMiniBar = useCallback((config: MiniBarConfig) => setBar(config), []);
  const updateMiniBar = useCallback((updates: Partial<MiniBarConfig>) => {
    setBar(prev => (prev ? { ...prev, ...updates } : prev));
  }, []);
  const hideMiniBar = useCallback(() => setBar(null), []);

  return (
    <CallMiniBarContext.Provider value={{ showMiniBar, updateMiniBar, hideMiniBar }}>
      {children}
      {bar && (
        <View style={s.bar}>
          <View style={s.avatar}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>
              {(bar.callerLabel || 'D').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{bar.callerLabel || 'Dispatcher'}</Text>
            <Text style={s.timer}>{fmt(bar.seconds)}</Text>
          </View>
          <TouchableOpacity
            onPress={bar.onToggleMute}
            style={[s.btn, bar.isMuted && s.btnActive]}
          >
            <Ionicons name={bar.isMuted ? 'mic-off' : 'mic'} size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={bar.onExpand} style={s.btn}>
            <Ionicons name="chevron-up" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={bar.onEnd} style={[s.btn, { backgroundColor: '#ef4444' }]}>
            <Ionicons
              name="call"
              size={16}
              color="#fff"
              style={{ transform: [{ rotate: '135deg' }] }}
            />
          </TouchableOpacity>
        </View>
      )}
    </CallMiniBarContext.Provider>
  );
}

const s = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 70,
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { color: '#fff', fontSize: 13, fontWeight: '600' },
  timer: { color: '#22c55e', fontSize: 11, fontWeight: '500' },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnActive: { backgroundColor: 'rgba(255,255,255,0.28)' },
});
