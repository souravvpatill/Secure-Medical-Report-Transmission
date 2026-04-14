import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend

# --- AES Section (For File Payload) ---

def encrypt_payload(data: bytes) -> tuple[bytes, bytes]:
    """
    Encrypts data using AES-256-GCM.
    Returns (encrypted_data, aes_key).
    """
    key = AESGCM.generate_key(bit_length=256)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, data, None)
    return nonce + ciphertext, key

def decrypt_payload(encrypted_data: bytes, aes_key: bytes) -> bytes:
    """
    Decrypts data using AES-256-GCM.
    """
    aesgcm = AESGCM(aes_key)
    nonce = encrypted_data[:12]
    ciphertext = encrypted_data[12:]
    return aesgcm.decrypt(nonce, ciphertext, None)

# --- RSA Section (For Key Wrapping & Signatures) ---

def generate_rsa_key_pair():
    """
    Generates a new RSA-2048 key pair.
    """
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    public_key = private_key.public_key()
    return private_key, public_key

def serialize_private_key(private_key) -> bytes:
    return private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )

def serialize_public_key(public_key) -> bytes:
    return public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )

def load_private_key(pem_data: bytes):
    return serialization.load_pem_private_key(
        pem_data,
        password=None,
        backend=default_backend()
    )

def load_public_key(pem_data: bytes):
    return serialization.load_pem_public_key(
        pem_data,
        backend=default_backend()
    )

def wrap_key(aes_key: bytes, public_key) -> bytes:
    """
    Wraps (encrypts) the AES key using the recipient's RSA public key.
    """
    return public_key.encrypt(
        aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )

def unwrap_key(wrapped_key: bytes, private_key) -> bytes:
    """
    Unwraps (decrypts) the AES key using the recipient's RSA private key.
    """
    return private_key.decrypt(
        wrapped_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )

# --- Integrity Section ---

def get_file_hash(data: bytes) -> str:
    digest = hashes.Hash(hashes.SHA256(), backend=default_backend())
    digest.update(data)
    return digest.finalize().hex()
