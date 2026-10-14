export type Printer = {
  id: number;
  patrimonio: string;
  nome: string;
  setor: string;
  localizacao: string;
  modelo: string;
  numero_serie: string;
  ip: string;
  ativa: number;
  criado_em: string;
};

export type Report = {
  id: number;
  mes_referencia: string;
  gerado_em: string;
  total_impressoes: number;
  caminho_pdf: string;
  dados_monitoramento: string;
};

export type ReportItem = {
  id: number;
  relatorio_id: number;
  impressora_id: number;
  patrimonio: string;
  nome: string;
  setor: string;
  localizacao: string;
  modelo: string;
  impressoes: number;
};
