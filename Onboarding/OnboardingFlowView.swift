import SwiftUI

struct OnboardingFlowView: View {
  private let pages: [OnboardingPageModel] = [
    .init(id: "hero", content: .hero, chrome: .hero),
    .init(
      id: "future_page",
      content: .copy(
        title: "Keep improving roads",
        subtitle: "More screens can be added here."
      )
    ),
  ]

  @State private var selection: Int = 0

  var body: some View {
    ZStack {
      OnboardingStyles.background.ignoresSafeArea()

      VStack(spacing: OnboardingStyles.verticalSpacing) {
        if currentPage.chrome.showStepChip {
          HStack {
            StepChip(current: selection + 1, total: totalPages)
            Spacer()
          }
          .padding(.horizontal, OnboardingStyles.pageHorizontalPadding)
        }

        TabView(selection: $selection) {
          ForEach(Array(pages.enumerated()), id: \.element) { index, page in
            Group {
              switch page.content {
              case .hero:
                OnboardingScreen1View()
              case let .copy(title, subtitle):
                OnboardingGenericPage(
                  title: title,
                  subtitle: subtitle,
                  alignment: page.chrome.contentAlignment
                )
              }
            }
            .tag(index)
          }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))

        if currentPage.chrome.showPageDots {
          PageDots(currentIndex: selection, total: totalPages)
        }
      }
    }
    .safeAreaInset(edge: .bottom) {
      PrimaryPillButton(
        title: isLastPage ? "Get Started" : "Continue",
        style: currentPage.chrome.ctaStyle,
        action: advance
      )
    }
    .contentShape(Rectangle())
  }

  private var totalPages: Int {
    pages.count
  }

  private var isLastPage: Bool {
    selection >= totalPages - 1
  }

  private func advance() {
    withAnimation(.spring(response: 0.4, dampingFraction: 0.9)) {
      selection = min(selection + 1, totalPages - 1)
    }
  }

  private var currentPage: OnboardingPageModel {
    guard pages.indices.contains(selection) else { return pages[pages.endIndex - 1] }
    return pages[selection]
  }

}

struct StepChip: View {
  var current: Int
  var total: Int

  var body: some View {
    Text("Step \(current)/\(total)")
      .font(.system(size: 14, weight: .semibold, design: .rounded))
      .foregroundColor(OnboardingStyles.primaryText)
      .padding(.horizontal, 12)
      .padding(.vertical, 6)
      .background(
        Capsule(style: .continuous)
          .fill(Color.white.opacity(0.08))
      )
      .overlay(
        Capsule(style: .continuous)
          .stroke(Color.white.opacity(0.16), lineWidth: 1)
      )
  }
}

struct PageDots: View {
  var currentIndex: Int
  var total: Int

  var body: some View {
    HStack(spacing: 8) {
      ForEach(0..<total, id: \.self) { index in
        Capsule()
          .fill(index == currentIndex ? OnboardingStyles.primaryText : OnboardingStyles.secondaryText.opacity(0.4))
          .frame(width: index == currentIndex ? 18 : 8, height: 8)
          .animation(.easeInOut(duration: 0.2), value: currentIndex)
      }
    }
    .padding(.horizontal, OnboardingStyles.pageHorizontalPadding)
  }
}

struct OnboardingPageModel: Identifiable, Hashable {
  var id: String
  var content: OnboardingPageContent
  var chrome: OnboardingChrome = .standard

  init(id: String, content: OnboardingPageContent, chrome: OnboardingChrome = .standard) {
    self.id = id
    self.content = content
    self.chrome = chrome
  }
}

enum OnboardingPageContent: Hashable {
  case hero
  case copy(title: String, subtitle: String)
}

struct OnboardingChrome: Hashable {
  var showStepChip: Bool
  var showPageDots: Bool
  var ctaStyle: OnboardingCTAStyle
  var contentAlignment: OnboardingContentAlignment

  init(
    showStepChip: Bool = true,
    showPageDots: Bool = true,
    ctaStyle: OnboardingCTAStyle = .brandBlue,
    contentAlignment: OnboardingContentAlignment = .standard
  ) {
    self.showStepChip = showStepChip
    self.showPageDots = showPageDots
    self.ctaStyle = ctaStyle
    self.contentAlignment = contentAlignment
  }

  static let standard = OnboardingChrome()
  static let hero = OnboardingChrome(
    showStepChip: false,
    showPageDots: false,
    ctaStyle: .whitePill,
    contentAlignment: .centerHero
  )
}

enum OnboardingCTAStyle: Hashable {
  case whitePill
  case brandBlue

  var backgroundColor: Color {
    switch self {
    case .whitePill:
      return .white
    case .brandBlue:
      return OnboardingStyles.brandBlue
    }
  }

  var foregroundColor: Color {
    switch self {
    case .whitePill:
      return .black
    case .brandBlue:
      return .white
    }
  }
}

enum OnboardingContentAlignment: Hashable {
  case centerHero
  case standard
}

/// Generic placeholder for subsequent pages until designs are filled in.
struct OnboardingGenericPage: View {
  var title: String
  var subtitle: String
  var alignment: OnboardingContentAlignment

  var body: some View {
    VStack(
      alignment: alignment == .centerHero ? .center : .leading,
      spacing: OnboardingStyles.verticalSpacing
    ) {
      Text(title)
        .font(OnboardingStyles.headlineFont)
        .foregroundColor(OnboardingStyles.primaryText)
        .multilineTextAlignment(alignment == .centerHero ? .center : .leading)

      Text(subtitle)
        .font(OnboardingStyles.subtitleFont)
        .foregroundColor(OnboardingStyles.secondaryText)
        .lineSpacing(4)
        .multilineTextAlignment(alignment == .centerHero ? .center : .leading)

      Spacer()
    }
    .frame(maxWidth: .infinity, alignment: alignment == .centerHero ? .center : .leading)
    .padding(.horizontal, OnboardingStyles.pageHorizontalPadding)
    .padding(.top, OnboardingStyles.pageHorizontalPadding)
  }
}

struct OnboardingFlowView_Previews: PreviewProvider {
  static var previews: some View {
    OnboardingFlowView()
  }
}
