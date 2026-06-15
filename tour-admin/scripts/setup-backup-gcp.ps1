# Prerrequisito OBLIGATORIO antes de la primera copia de seguridad en produccion.
# Requiere: gcloud CLI autenticado con permisos de Owner/Editor en el proyecto.
# Uso: .\scripts\setup-backup-gcp.ps1 [-ProjectId patagonia-12448] [-Location nam5]

param(
  [string]$ProjectId = "patagonia-12448",
  [string]$Location = "nam5"
)

$ErrorActionPreference = "Stop"
$BackupBucket = "$ProjectId-backups"

Write-Host "Proyecto: $ProjectId"
Write-Host "Bucket de respaldos: gs://$BackupBucket"

gcloud config set project $ProjectId | Out-Null

# 1. Crear el bucket de respaldos si no existe (misma ubicacion que Firestore).
$bucketExists = gcloud storage buckets describe "gs://$BackupBucket" 2>$null
if (-not $bucketExists) {
  gcloud storage buckets create "gs://$BackupBucket" --location=$Location --uniform-bucket-level-access
  Write-Host "Bucket de respaldos creado."
} else {
  Write-Host "Bucket de respaldos ya existe."
}

# 2. Detectar el bucket de Storage de la app (origen de los archivos a respaldar).
#    Firebase usa {project}.firebasestorage.app (proyectos nuevos) o {project}.appspot.com (antiguos).
$SourceBuckets = @()
foreach ($candidate in @("$ProjectId.firebasestorage.app", "$ProjectId.appspot.com")) {
  $exists = gcloud storage buckets describe "gs://$candidate" 2>$null
  if ($exists) {
    $SourceBuckets += $candidate
    Write-Host "Bucket de origen detectado: gs://$candidate"
  }
}
if ($SourceBuckets.Count -eq 0) {
  Write-Warning "No se detecto el bucket de Storage de la app. Verificalo en Firebase Console > Storage."
}

# 3. Identificar la cuenta de servicio de ejecucion de Cloud Functions Gen2 (compute por defecto).
$ProjectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
$RuntimeSa = "serviceAccount:$ProjectNumber-compute@developer.gserviceaccount.com"
Write-Host "Cuenta de servicio de runtime: $RuntimeSa"

# 4. Conceder permisos de exportacion/importacion de Firestore a nivel de proyecto.
gcloud projects add-iam-policy-binding $ProjectId `
  --member=$RuntimeSa `
  --role="roles/datastore.importExportAdmin" `
  --condition=None | Out-Null
Write-Host "Concedido roles/datastore.importExportAdmin."

# 5. Permitir escritura completa en el bucket de respaldos.
gcloud storage buckets add-iam-policy-binding "gs://$BackupBucket" `
  --member=$RuntimeSa `
  --role="roles/storage.objectAdmin" | Out-Null
Write-Host "Concedido roles/storage.objectAdmin en gs://$BackupBucket."

# 6. Permitir lectura del bucket de origen para copiar los archivos.
foreach ($source in $SourceBuckets) {
  gcloud storage buckets add-iam-policy-binding "gs://$source" `
    --member=$RuntimeSa `
    --role="roles/storage.objectViewer" | Out-Null
  Write-Host "Concedido roles/storage.objectViewer en gs://$source."
}

# 7. Verificacion final.
Write-Host ""
Write-Host "=== Verificacion ==="
gcloud storage buckets describe "gs://$BackupBucket" --format="value(name,location)"
Write-Host "Bindings IAM del proyecto para la SA de runtime:"
gcloud projects get-iam-policy $ProjectId `
  --flatten="bindings[].members" `
  --filter="bindings.members:$RuntimeSa" `
  --format="table(bindings.role)"

Write-Host ""
Write-Host "Configuracion completada. Ahora prueba 'Crear copia de seguridad' desde Configuracion."
