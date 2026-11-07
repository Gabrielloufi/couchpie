import speech_recognition as sr
from os import path
import time


#def main() """
#    Listener function for Raspberry Pi Personal Assistant (PiPA)
#    """

AUDIO_FILE = path.join(path.dirname(path.realpath(__file__)), "english.wav")

audio = sr.AudioData.from_file(AUDIO_FILE)

r = sr.Recognizer()