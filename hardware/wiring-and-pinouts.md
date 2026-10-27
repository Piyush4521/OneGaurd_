# OneGuard LPG — Hardware Wiring & Electrical Validation Specification

## 1. Bill of Materials (BOM) & Component Verification

| Component | Part / Model | Voltage Rating | Logic Level | Connection Interface | Power Consumption / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Microcontroller** | ESP32-WROOM-32 DevKit V1 (30 or 38-pin) | 5V (USB/VIN) / 3.3V (VCC) | 3.3V | Wi-Fi 802.11 b/g/n, BLE | ~80mA avg, up to 240mA peak during Wi-Fi transmission |
| **Load Cells** | 4x 50kg 3-wire half-bridge strain gauges | Up to 10V excitation | Analog strain | 3-wire half bridge (Wheatstone bridge configuration) | Combined 200kg gross max rated capacity, safe working capacity ~100kg |
| **Combinator** | SparkFun Load Sensor Combinator v1.1 | 5V / 3.3V excitation | Analog (Wheatstone) | 4 load cells in -> 4-wire Wheatstone Bridge out (RED, BLK, WHT, GRN) | Forms full Wheatstone bridge with temperature compensation |
| **ADC Amplifier** | HX711 24-Bit ADC module | 2.7V - 5.5V (Recommended: 5V excitation, 3.3V logic) | 3.3V tolerant | 2-wire serial (`DOUT`: GPIO 25, `SCK`: GPIO 26) | High precision 24-bit differential input |
| **Gas Sensor** | MQ-6 (LPG, Isobutane, Propane detector) | 5V ± 0.1V (Heater & Circuit) | Analog out: 0-5V (Divider to 3.3V for ESP32 ADC) | Analog (`AO`: GPIO 34) + Digital Comparator (`DO`: GPIO 27) | Internal heater ~150mA at 5V (~750mW). Must NOT be powered from ESP32 3.3V pin! |
| **RTC Module** | DS3231 High-Precision I2C RTC | 2.3V - 5.5V (Recommended 3.3V) | 3.3V I2C | I2C (`SDA`: GPIO 21, `SCL`: GPIO 22) | Battery backed (CR2032), ±2ppm accuracy |
| **Buzzer** | Not Installed | N/A | N/A | None | **Buzzer is not installed.** Do not configure a buzzer GPIO. Audio alerts are handled by PWA browser Web Audio and cloud/phone dispatch. |
| **Filtering Capacitors** | Electrolytic (100µF, 10µF) & Ceramic (0.1µF) | >= 16V | N/A | Across power rails (5V, 3.3V, HX711 VDD/VCC) | Decoupling and noise suppression on load-cell and sensor supply |

---

## 2. Power Architecture & Grounding Rules

> [!CAUTION]
> **Power Rail Isolation & Capacity:**
> 1. The **MQ-6 heater** consumes ~150–160mA continuously at 5.0V. Connecting the MQ-6 heater to the ESP32's onboard 3.3V regulator WILL cause voltage sag, brownout resets, and inaccurate ADC readings. Use a dedicated 5V rail.
> 2. The **HX711** analog excitation benefits from a stable, low-noise supply. Use a dedicated 5V regulated rail with decoupling capacitors (10µF + 0.1µF) right at the HX711 VCC/AVDD pins.
> 3. Provide a common star-ground topology to prevent ground loops between the high-current MQ-6 heater return and the sensitive HX711 microvolt signal ground.

---

## 3. ESP32 DevKit Confirmed Pinout Mapping

| ESP32 GPIO | Direction | Connected Device | Function | Safety / Electrical Considerations |
| :--- | :--- | :--- | :--- | :--- |
| **GPIO 25** | Input | HX711 ADC | DOUT / DT (Data Output) | Safe general input pin. 24-bit strain-gauge serial data. |
| **GPIO 26** | Output | HX711 ADC | SCK / CLK (Serial Clock) | Safe general output pin. Serial clock pulses to read HX711. |
| **GPIO 34** | Analog In | MQ-6 AO (via 2:1 divider) | Gas Level Analog Voltage | Input-only GPIO (ADC1_CH6). Not affected by Wi-Fi ADC2 conflicts! |
| **GPIO 27** | Digital In | MQ-6 DO (Digital threshold) | Gas Threshold Comparator | Digital input (LM393 comparator). Active-LOW (0 on threshold trip). Dedicated to MQ-6 DO (not buzzer!). |
| **GPIO 21** | In/Out | DS3231 RTC | I2C SDA (Serial Data) | Hardware I2C default with 4.7kΩ pull-up to 3.3V |
| **GPIO 22** | Out | DS3231 RTC | I2C SCL (Serial Clock) | Hardware I2C default with 4.7kΩ pull-up to 3.3V |
| **GPIO 2** | Output | Status LED | Local state indicator | Strapping pin (must be floating or LOW during boot). Flashes during local emergency. |
| **Buzzer** | None | Not Installed | None | **Do not configure any buzzer GPIO.** |

> [!IMPORTANT]
> **ADC Pin Selection Warning:**
> In ESP32, **ADC2** pins (GPIO 0, 2, 4, 12, 13, 14, 15, 25, 26, 27) cannot be used reliably as analog inputs when Wi-Fi is actively transmitting. Therefore, **GPIO 34 (ADC1_CH6)** is specifically chosen for MQ-6 analog reading, ensuring stable sensor reads during cloud synchronization.

---

## 4. SparkFun Load Sensor Combinator & Half-Bridge Wiring

Four 50kg three-wire strain gauges are wired into the SparkFun Combinator v1.1:

```
          [ Load Cell 1 - Front Left ]       [ Load Cell 2 - Front Right ]
                      |                                   |
             RED    WHITE   BLACK                RED    WHITE   BLACK
              |       |       |                   |       |       |
           [ C ]    [ + ]   [ - ]              [ C ]    [ + ]   [ - ]
          +-----------------------------------------------------------+
          |             SparkFun Combinator Board v1.1                |
          +-----------------------------------------------------------+
           [ C ]    [ + ]   [ - ]              [ C ]    [ + ]   [ - ]
              |       |       |                   |       |       |
             RED    WHITE   BLACK                RED    WHITE   BLACK
                      |                                   |
          [ Load Cell 3 - Rear Left ]        [ Load Cell 4 - Rear Right ]
```

Combinator Output to HX711:
- **RED (E+)** -> HX711 E+ (Excitation Positive)
- **BLK (E-)** -> HX711 E- (Excitation Negative / Ground)
- **WHT (A-)** -> HX711 A- (Signal Negative)
- **GRN (A+)** -> HX711 A+ (Signal Positive)

---

## 5. MQ-6 Gas Sensor Signal Conditioning

The MQ-6 output voltage ranges from 0.1V up to ~4.5V depending on gas concentration. Because ESP32 ADC inputs have an absolute maximum rating of 3.6V (linear range 0.1V - 2.6V with 11dB attenuation):
- **Voltage Divider Required:**
  - $V_{out} = V_{MQ} \times \frac{R_2}{R_1 + R_2}$
  - Using $R_1 = 10k\Omega$ and $R_2 = 20k\Omega$ (or $10k\Omega / 10k\Omega$ for 2:1 division):
  - At 5V maximum MQ-6 output, divided voltage is $2.5V$, safely inside the ESP32 ADC linear measurement zone.

---

## 6. Safety and Validation Rules

1. **Never use flames or open LPG releases for testing.** Use clean butane lighter headspace (depressing valve gently without ignition at a safe distance in ventilated outdoor conditions) for threshold trigger verification.
2. **Local Autonomous Alarm:** If MQ-6 exceeds the safety threshold ($>1000\text{ ppm}$ warning, $>2000\text{ ppm}$ critical or DO digital trigger), local fail-safe triggers immediately (high-frequency status LED flash and event buffering) independent of Wi-Fi or Firebase connectivity. Physical buzzer is not installed.
3. **Stale Data Guard:** If telemetry is not received for $>60\text{ seconds}$, dashboard transitions to `stale`, and if $>180\text{ seconds}$, to `offline`.
