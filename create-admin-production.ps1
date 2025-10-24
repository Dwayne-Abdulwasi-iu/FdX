# Create Admin Account for Production Render Deployment

$body = @{
    firstName = "Admin"
    lastName = "User"
    email = "admin@fedex.com"
    password = "FedexAdmin2025!"
    phone = "+1234567890"
    address = @{
        street = "123 Admin Street"
        city = "New York"
        state = "NY"
        zipCode = "10001"
    }
    adminKey = "FEDEX_ADMIN_2025"
} | ConvertTo-Json -Depth 3

try {
    Write-Host "Creating admin user on production server..."
    Write-Host "Server: https://fedex-shipping.onrender.com"
    
    $response = Invoke-RestMethod -Uri "https://fedex-shipping.onrender.com/api/auth/register-admin" -Method POST -Body $body -ContentType "application/json"
    
    Write-Host ""
    Write-Host "✅ Admin user created successfully!"
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Host "📧 Email: admin@fedex.com"
    Write-Host "🔑 Password: FedexAdmin2025!"
    Write-Host "🎫 Token: $($response.token)"
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Host ""
    Write-Host "🚀 Access your admin panel:"
    Write-Host "1. Go to: https://fedex-shipping.onrender.com"
    Write-Host "2. Click 'Login' in the navigation"
    Write-Host "3. Use the credentials above"
    Write-Host "4. Click 'Admin Login' to access the admin dashboard"
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Change the password after first login!"
    
} catch {
    Write-Host "❌ Error creating admin user:"
    Write-Host $_.Exception.Message
    
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Server response: $responseBody"
    }
    
    Write-Host ""
    Write-Host "💡 Troubleshooting:"
    Write-Host "- Make sure the server is running at https://fedex-shipping.onrender.com"
    Write-Host "- Check if admin account already exists"
    Write-Host "- Verify the ADMIN_KEY matches in your environment variables"
}