// ./data/defaultSettings.js

module.exports = {
    checklist: [
        {
            text: "Hijacked",
            type: "critical",
            state: "default",
            tooltip:
                "This check serves as a reminder to assess your emotional state before trading. Emotional hijacking—whether from rage, FOMO, or overconfidence—can impair judgment and lead to costly mistakes. Developing awareness of your emotions and recognizing your body's signals is key to maintaining discipline.",
        },
        {
            text: "MACD",
            type: "critical",
            state: "default",
            tooltip:
                "The MACD signal indicator helps identify trend direction and momentum shifts, reducing the risk of trading against the trend. It can assist in avoiding the backside of a move by confirming strength or weakness in price action, helping you time entries and exits more effectively.",
        },
        {
            text: "Volume",
            type: "critical",
            state: "default",
            tooltip:
                "Volume reveals market sentiment and strength. High volume confirms trends—bullish or bearish—while low volume signals weak moves. Tracking volume helps you follow the pack, spot momentum shifts, and avoid false breakouts.",
        },
        // Continue the rest of the checklist...
    ],
    sessionCountdowns: [
        {
            start: "04:00",
            end: "09:30",
            title: "Pre Market",
        },
        {
            start: "07:00",
            end: "09:30",
            title: "Breaking News",
        },
        {
            start: "09:30",
            end: "16:00",
            title: "Open Market",
        },
        {
            start: "15:00",
            end: "16:00",
            title: "Power Hour",
        },
        {
            start: "16:00",
            end: "20:00",
            title: "Post Market",
        },
    ],
    notesItems: [
        {
            text: "MTT (Moms Traders Tool)",
            type: "Optional",
        },
        {
            text: "Moms Trader Tools is a comprehensive suite designed to enhance the trading experience for both novice and experienced day traders. With a focus on efficiency and user-friendliness, this toolset aims to streamline your trading process and provide a competitive edge.",
            type: "optional",
        },
    ],
    snippers: [],
    countdownTransparent: false,
};
