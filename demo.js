const openpgp = require("openpgp"); // use as CommonJS, AMD, ES6 module or via window.openpgp

const senderKeyPair = require("./a.key");
const receiverKeyPair = require("./b.key");

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
  // what the private key is encrypted with
  let senderPassphrase = `super long and hard to guess secret`;
  let receiverPassphrase = `super long and hard to guess secret`;

  // Get a,b public and private key.
  const senderPublicKey = await openpgp.readKey({
    armoredKey: senderKeyPair.publicKeyArmored,
  });

  const senderPrivateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({
      armoredKey: senderKeyPair.privateKeyArmored,
    }),
    passphrase: senderPassphrase,
  });
  const receiverPublicKey = await openpgp.readKey({
    armoredKey: receiverKeyPair.publicKeyArmored,
  });

  const receiverPrivateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({
      armoredKey: receiverKeyPair.privateKeyArmored,
    }),
    passphrase: receiverPassphrase,
  });

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
