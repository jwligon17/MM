import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";

const DEFAULT_COLORS = ["#FF6A00", "#FFC24A"];
const DEFAULT_START = { x: 0, y: 0.5 };
const DEFAULT_END = { x: 1, y: 0.5 };

const GradientText = ({
  children,
  style,
  colors = DEFAULT_COLORS,
  start = DEFAULT_START,
  end = DEFAULT_END,
}) => {
  return (
    <MaskedView
      maskElement={
        <View style={{ backgroundColor: "transparent" }}>
          <Text style={style}>{children}</Text>
        </View>
      }
    >
      <LinearGradient start={start} end={end} colors={colors}>
        {/* Transparent text preserves layout while letting the gradient show through the mask */}
        <Text style={[style, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
};

export default GradientText;
