export const onboardingAssets = {
  locationServicesMock: require("./locationservices.png"),
  locationServicesAllowMock: require("./locationservicesallow.png"),
  greenArrow: require("./greenarrow.png"),
  alwaysAllowMock: require("./alwaysallow.png"),
  mendingBeforeAfterChart: require("./mending_before_after.png"),
  beforeAfterGraph: require("./beforeafter.png"),
  carIcon: require("./car.png"),
  orangeCarIcon: require("./orangecar.png"),
  briefcaseIcon: require("./briefcase.png"),
  megaphoneIcon: require("./megaphone.png"),
  redMegaphone: require("./redmegaphone.png"),
  patentPendingIcon: require("./patentpending.png"),
  moneyBagsIcon: require("./moneybags.png"),
  mathBackground: require("./mathbackground.png"),
  grayNewMenderPatch: require("../../assets/graynewmenderpatch.png"),
  newMenderPatch: require("./newmenderpatch.png"),
  preMomentumPatch: require("../../assets/premomentumpatch.png"),
  momentumPatch: require("./momentumpatch.png"),
  greenBlobBackground: require("./greenblobbackground.png"),
  speedometerIcon: require("./speedometer.png"),
  driveToMapPhone: require("../../assets/drive_to_map_phone.png"),
  greenStraightArrow: require("./greenstraightarrow.png"),
  stat1100: require("./1100.png"),
  stat600: require("./600.png"),
  // Video asset lives in the root assets folder
  greenEkgVideo: require("../../assets/greenekg.mp4"),
};

import { Image } from "react-native";

if (__DEV__) {
  console.log(
    "[onboardingAssets] stat1100 resolve",
    Image.resolveAssetSource(onboardingAssets.stat1100),
  );
}
