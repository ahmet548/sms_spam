from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = load_model('spam_model.h5')

with open('tokenizer.pkl', 'rb') as f:
    tokenizer = pickle.load(f)

class EmailRequest(BaseModel):
    text: str

@app.post("/predict")
async def predict_spam(request: EmailRequest):

    incoming_text = [request.text]
    
    sequences = tokenizer.texts_to_sequences(incoming_text)
    padded = pad_sequences(sequences, maxlen=20)
    
    prediction = model.predict(padded)[0][0] 
    
    is_spam = bool(prediction > 0.5)
    confidence = float(prediction) * 100 if is_spam else (1 - float(prediction)) * 100

    return {
        "is_spam": is_spam,
        "confidence": round(confidence, 1)
    }