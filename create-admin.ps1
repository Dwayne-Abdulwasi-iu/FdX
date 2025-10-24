# Wait for server to be ready
Start-Sleep -Seconds 3

$body = @{
    firstName = "Admin"
    lastName = "User"
    email = "admin@ferdex.com"
    password = "admin123"
    phone = "+1234567890"
    address = @{
        street = "123 Admin St"
        city = "Admin City"
        state = "NY"
        zipCode = "12345"
    }
    adminKey = "FEDEX_ADMIN_2025"
} | ConvertTo-Json -Depth 3

try {
    Write-Host "Creating admin user..."
    $response = Invoke-RestMethod -Uri "http://localhost:3002/api/auth/register-admin" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ Admin user created successfully!"
    Write-Host "📧 Email: admin@ferdex.com"
    Write-Host "🔑 Password: admin123"
    Write-Host "🎫 Token: $($response.token)"
    Write-Host ""
    Write-Host "Now you can:"
    Write-Host "1. Log out of your current account"
    Write-Host "2. Log in with admin@ferdex.com / admin123"
    Write-Host "3. Access the customer support platform"
} catch {
    Write-Host "❌ Error creating admin user:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Server response: $responseBody"
    }
}