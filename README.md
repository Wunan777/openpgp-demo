# OpenPGP Demo
Demo for `data encryption` and `signature`.

Usage: 
step1: Generate key pairs(`private key` - `public key`) for the `sender` and `receiver`.
```
node generateKeyPair.js
```

step2: Save the key pairs into the keypair-file, and run the demo, which will load the keypair-file
```
node demo.js --sender.key --receiver.key
```


