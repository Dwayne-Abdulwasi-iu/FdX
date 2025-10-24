const mongoose = require('mongoose');
require('dotenv').config();

async function testConnections() {
    console.log('🧪 Testing MongoDB Atlas connections...\n');
    
    const connections = [
        {
            name: 'Primary SRV Connection',
            uri: 'mongodb+srv://lytleewayne:Abdulwasiu@cluster0.as7yeiu.mongodb.net/fedex-shipping?retryWrites=true&w=majority'
        },
        {
            name: 'SRV with IPv4 Only',
            uri: 'mongodb+srv://lytleewayne:Abdulwasiu@cluster0.as7yeiu.mongodb.net/fedex-shipping?retryWrites=true&w=majority&family=4'
        },
        {
            name: 'Standard Connection (fallback)',
            uri: 'mongodb://lytleewayne:Abdulwasiu@cluster0-shard-00-00.as7yeiu.mongodb.net:27017,cluster0-shard-00-01.as7yeiu.mongodb.net:27017,cluster0-shard-00-02.as7yeiu.mongodb.net:27017/fedex-shipping?ssl=true&replicaSet=atlas-14btw9-shard-0&authSource=admin&retryWrites=true&w=majority'
        }
    ];
    
    for (let i = 0; i < connections.length; i++) {
        const { name, uri } = connections[i];
        console.log(`${i + 1}. Testing ${name}...`);
        
        try {
            const conn = await mongoose.connect(uri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                family: 4
            });
            
            console.log(`   ✅ Success! Connected to: ${conn.connection.host}`);
            console.log(`   📊 Database: ${conn.connection.name}`);
            console.log(`   🔗 Working connection string: ${uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);
            
            await mongoose.disconnect();
            return uri; // Return working connection
            
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}\n`);
        }
    }
    
    console.log('❌ All connection attempts failed. Check your network and MongoDB Atlas setup.');
    return null;
}

testConnections()
    .then(workingUri => {
        if (workingUri) {
            console.log('🎉 Use this connection string in your .env file:');
            console.log(`MONGODB_URI=${workingUri}`);
        }
        process.exit(0);
    })
    .catch(console.error);