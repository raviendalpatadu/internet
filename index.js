const express = require('express');
const NetworkSpeed = require('network-speed');  // ES5
const testNetworkSpeed = new NetworkSpeed();



const app = express();
const port = 3000;



app.set('view engine', 'ejs')


app.get('/', function (req, res){
    res.render("index",{speed:''})
})


async function getNetworkDownloadSpeed() {
        
    const baseUrl = 'https://eu.httpbin.org/stream-bytes/500000';
    const fileSizeInBytes = 500000;
    const speed = await testNetworkSpeed.checkDownloadSpeed(baseUrl, fileSizeInBytes);
    return speed      
    
      
}

async function getNetworkUploadSpeed() {
    const options = {
      hostname: 'www.google.com',
      port: 80,
      path: '/catchers/544b09b4599c1d0200000289',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    const fileSizeInBytes = 2000000
    const upspeed = await testNetworkSpeed.checkUploadSpeed(options, fileSizeInBytes); 
    return upspeed  
} 


app.get('/checkspeed', async function (req, res){

    try{
        let ups = await getNetworkDownloadSpeed();
    

        let downs = await getNetworkUploadSpeed();
    
        const data = {"upspeed":ups.mbps,
                        "downspeed":downs.mbps}
    
        res.send(data)
    }
    catch (error) {
        console.log(error)
    }
      
})


app.listen(port, () => console.log(`Example app listening on port ${port}!`))

