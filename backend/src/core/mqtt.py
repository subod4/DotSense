import paho.mqtt.client as mqtt
import logging
import time
from src.config import get_settings

logger = logging.getLogger(__name__)

class LetterPublisher:
    def __init__(self):
        settings = get_settings()
        self.broker = settings.mqtt_broker
        self.port = settings.mqtt_port
        self.username = settings.mqtt_username
        self.password = settings.mqtt_password
        self.topic = settings.mqtt_topic
        
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="BraillePublisher")
        
        if self.username and self.password:
            self.client.username_pw_set(self.username, self.password)
            self.client.tls_set()
        
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_publish = self.on_publish
        
        self.connected = False

    def on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            logger.info("Connected to MQTT Broker")
            self.connected = True
        else:
            logger.error(f"Failed to connect to MQTT Broker with code {reason_code}")
            self.connected = False

    def on_disconnect(self, client, userdata, reason_code, properties):
        logger.info("Disconnected from MQTT Broker")
        self.connected = False

    def on_publish(self, client, userdata, mid, reason_code, properties):
        logger.debug(f"Message published (ID: {mid})")

    def connect(self):
        logger.info(f"Connecting to MQTT Broker at {self.broker}:{self.port}...")
        try:
            self.client.connect(self.broker, self.port, keepalive=60)
            self.client.loop_start()
            
            # Wait for connection
            timeout = 5
            start_time = time.time()
            while not self.connected and (time.time() - start_time < timeout):
                time.sleep(0.1)
                
            if not self.connected:
                logger.warning("MQTT connection timeout")
                return False
            return True
        except Exception as e:
            logger.error(f"MQTT Connection Error: {e}")
            return False

    def disconnect(self):
        self.client.loop_stop()
        self.client.disconnect()

    def publish_letter(self, letter: str) -> bool:
        if not self.connected:
            logger.error("Cannot publish: Not connected to MQTT Broker")
            return False
        
        try:
            result = self.client.publish(self.topic, letter, qos=1)
            result.wait_for_publish(timeout=2)
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"Sent letter '{letter}' to {self.topic}")
                return True
            else:
                logger.error(f"Failed to publish letter: {result.rc}")
                return False
        except Exception as e:
            logger.error(f"Error publishing letter: {e}")
            return False

# Global instance
publisher = LetterPublisher()
