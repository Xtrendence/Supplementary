import { useEffect, useState } from "react";
import NetInfo, {
  NetInfoState,
  NetInfoStateType,
} from "@react-native-community/netinfo";

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: NetInfoStateType | null;
}

export function useNetworkConnection() {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    type: null,
  });

  useEffect(() => {

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type ?? null,
      });
    });

    NetInfo.fetch().then((state: NetInfoState) => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type ?? null,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const checkConnection = async () => {
    try {
      const state = await NetInfo.fetch();
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type ?? null,
      });
      return state.isConnected && state.isInternetReachable;
    } catch (error) {
      console.warn("Failed to check network:", error);
      return false;
    }
  };

  return { ...networkState, checkConnection };
}

export function useIsOnline() {
  const { isConnected, isInternetReachable } = useNetworkConnection();
  return isConnected && isInternetReachable;
}
