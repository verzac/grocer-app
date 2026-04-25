import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected === true);
    });
    NetInfo.fetch().then((state) => {
      setOnline(state.isConnected === true);
    });
    return () => sub();
  }, []);

  return online;
}
