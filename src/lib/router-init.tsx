import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setRouterNavigate } from "./navigation";

export default function RouterInit() {
  const navigate = useNavigate();

  useEffect(() => {
    setRouterNavigate((to: string, options?: { replace?: boolean }) => {
      if (options?.replace) navigate(to, { replace: true });
      else navigate(to);
    });
  }, [navigate]);

  return null;
}
