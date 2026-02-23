Write-Host "Creating admin user on production server..."

$adminData = @{
    firstName = "Admin"
    lastName = "User"
    email = "admin@ATLAS Delivery.com"
    password = "ATLAS DeliveryAdmin2025!"
    phone = "+1234567890"
    address = @{
        street = "123 Admin Street"
        city = "New York"
        state = "NY"
        zipCode = "10001"
    }
    adminKey = "ATLAS_ADMIN_2025"
}

$json = $adminData | ConvertTo-Json -Depth 3

try {
    $response = Invoke-RestMethod -Uri "https://ATLAS Delivery-shipping.onrender.com/api/auth/register-admin" -Method POST -Body $json -ContentType "application/json"
    
    Write-Host ""
    Write-Host "✅ Admin user created successfully!"
    Write-Host "Email: admin@ATLAS Delivery.com"
    Write-Host "Password: ATLAS DeliveryAdmin2025!"
    Write-Host ""
    Write-Host "Login at: https://ATLAS Delivery-shipping.onrender.com"
    
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}