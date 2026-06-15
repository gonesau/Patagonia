# Prerrequisitos: gcloud CLI autenticado con permisos de Owner/Editor en el proyecto.
# Uso: .\scripts\setup-backup-gcp.ps1 [-ProjectId patagonia-12448] [-Location nam5]

param(
  [string]$ProjectId = "patagonia-12448",
  [string]$Location = "nam5"
)

$ErrorActionPreference = "Stop"
$BackupBucket = "$ProjectId-backups"
$AppBucket = "$ProjectId.appspot.com"

Write-Host "Proyecto: $ProjectId"
Write-Host "Bucket de respaldos: gs://$BackupBucket"

gcloud config set project $ProjectId | Out-Null

$bucketExists = gcloud storage buckets describe "gs://$BackupBucket" 2>$null
if (-not $bucketExists) {
  gcloud storage buckets create "gs://$BackupBucket" --location=$Location --uniform-bucket-level-access
  Write-Host "Bucket creado."
} else {
  Write-Host "Bucket ya existe."
}

$projectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
$functionsSa = "serviceAccount:$projectNumber@cloudbuild.gserviceaccount.com"
$defaultComputeSa = "serviceAccount:$projectNumber-compute@developer.gserviceaccount.com"
$appEngineSa = "serviceAccount:$ProjectId@appspot.gserviceaccount.com"

foreach ($sa in @($defaultComputeSa, $appEngineSa)) {
  gcloud projects add-iam-policy-binding $ProjectId `
    --member=$sa `
    --role="roles/datastore.importExportAdmin" `
    --condition=None | Out-Null
  gcloud storage buckets add-iam-policy-binding "gs://$BackupBucket" `
    --member=$sa `
    --role="roles/storage.admin" | Out-Null
  Write-Host "IAM aplicado a $sa"
}

Write-Host ""
Write-Host "Opcional: define variables de entorno en Cloud Functions (si el bucket de app no es el predeterminado):"
Write-Host "  BACKUP_BUCKET=$BackupBucket"
Write-Host "  STORAGE_BUCKET=$AppBucket"
Write-Host ""
Write-Host "Siguiente paso: desde tour-admin ejecutar"
Write-Host "  npm run build"
Write-Host "  npx firebase-tools@latest deploy --only firestore:rules,storage,functions,hosting"
