const openpgp = require("openpgp"); // use as CommonJS, AMD, ES6 module or via window.openpgp
const fs = require('fs');

const argv = require('minimist')(process.argv.slice(2));
if (!argv.sender_public_key) {
  console.warn("Missing sender_public_key. Please provide the necessary command line argument.");
  process.exit(1);
}
if (!argv.sender_private_key) {
  console.warn("Missing sender_private_key. Please provide the necessary command line argument.");
  process.exit(1);
}
if (!argv.receiver_public_key) {
  console.warn("Missing receiver_public_key. Please provide the necessary command line argument.");
  process.exit(1);
}
if (!argv.receiver_private_key) {
  console.warn("Missing receiver_private_key. Please provide the necessary command line argument.");
  process.exit(1);
}

function getKey() {
  const senderPublicKeyPath = argv.sender_public_key;
  const senderPrivateKeyPath = argv.sender_private_key;
  const receiverPublicKeyPath = argv.receiver_public_key;
  const receiverPrivateKeyPath = argv.receiver_private_key;
  
  let senderPublicKeyArmored = fs.readFileSync(senderPublicKeyPath, 'utf8');
  let senderPrivateKeyArmored = fs.readFileSync(senderPrivateKeyPath, 'utf8');
  let receiverPublicKeyArmored = fs.readFileSync(receiverPublicKeyPath, 'utf8');
  let receiverPrivateKeyArmored = fs.readFileSync(receiverPrivateKeyPath, 'utf8');
  console.log(senderPublicKeyArmored)
  return { 
    senderPublicKeyArmored, senderPrivateKeyArmored, receiverPublicKeyArmored, receiverPrivateKeyArmored
  }
}

async function senderEncrypt(message, senderPrivateKey, receiverPublicKey) {
  const encrypted = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: message }), // input as Message object
    encryptionKeys: receiverPublicKey,
    signingKeys: senderPrivateKey, // optional
  });

  return encrypted;
}

async function receiverDecrypt(encrypted, receiverPrivateKey, senderPublicKey) {
  const message = await openpgp.readMessage({
    armoredMessage: encrypted, // parse armored message
  });
  const { data: decrypted, signatures } = await openpgp.decrypt({
    message,
    verificationKeys: senderPublicKey, // optional
    decryptionKeys: receiverPrivateKey,
  });
  return { decrypted, signatures };
}

(async () => {
  // Step1 : prepare public/private key of the sender/receiver. 
  let {senderPublicKeyArmored, senderPrivateKeyArmored, receiverPublicKeyArmored, receiverPrivateKeyArmored} = getKey()
  let senderPassphrase = `super long and hard to guess secret`;
  let receiverPassphrase = `super long and hard to guess secret`;

  // Get sender public and private key.
  const senderPublicKey = await openpgp.readKey({
    armoredKey: senderPublicKeyArmored,
  });
  const senderPrivateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({
      armoredKey: senderPrivateKeyArmored,
    }),
    passphrase: senderPassphrase,
  });
  // Get receiver public and private key.
  const receiverPublicKey = await openpgp.readKey({
    armoredKey: receiverPublicKeyArmored,
  });
  const receiverPrivateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({
      armoredKey: receiverPrivateKeyArmored,
    }),
    passphrase: receiverPassphrase,
  });

  // Step2 : Encrypt and Decrypt.
  // Sender encrypt.
  let message = "Hello, World!";
  let encrypted = await senderEncrypt(
    message,
    senderPrivateKey,
    receiverPublicKey
  );
  console.log("encrypted message");
  console.log(encrypted); // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'

  // Receiver decrypt.
  let { decrypted, signatures } = await receiverDecrypt(
    encrypted,
    receiverPrivateKey,
    senderPublicKey
  );
  console.log("decrypted message");
  console.log(decrypted); // 'Hello, World!'

  // check signature validity (signed messages only)
  try {
    await signatures[0].verified; // throws on invalid signature
    console.log("Signature is valid");
  } catch (e) {
    throw new Error("Signature could not be verified: " + e.message);
  }
})();
