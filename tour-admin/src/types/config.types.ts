export interface PlantillasEmailConfig {
  confirmacionCuerpoHtml?: string;
  recordatorio7dCuerpoHtml?: string;
  recordatorio1dCuerpoHtml?: string;
  linkFotosCuerpoHtml?: string;
}

export interface ConfiguracionGlobal {
  id: string;
  nombreEmpresa: string;
  logoUrl?: string;
  emailContacto?: string;
  driveCarpetaRaizId?: string;
  plantillasEmail?: PlantillasEmailConfig;
}
