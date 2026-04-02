import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { getCredentials } from "../../services/api";

interface Props {
  integrationId: string;
  value: string;
  onChange: (credentialId: string) => void;
}

export function CredentialSelect({ integrationId, value, onChange }: Props) {
  const navigate = useNavigate();

  const { data: allCredentials = [] } = useQuery({
    queryKey: ["credentials"],
    queryFn: getCredentials,
  });

  const filtered = allCredentials.filter(
    (c: any) => c.integrationId === integrationId
  );

  return (
    <div className="flex gap-1.5">
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
      >
        <option value="">— Credential seç —</option>
        {filtered.map((c: any) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        onClick={() => navigate("/credentials")}
        title="Yeni credential ekle"
        className="px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 border border-gray-700 transition-colors"
      >
        <ExternalLink size={13} />
      </button>
    </div>
  );
}
