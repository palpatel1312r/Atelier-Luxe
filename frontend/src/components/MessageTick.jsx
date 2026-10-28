export default function MessageTick({ tick }) {
    if (tick === "read") {
        return (
            <svg
                className="tick tick--read"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
            >
                <polyline points="20 6 9 17 4 12"></polyline>
                <polyline points="20 10 13 17 8 12"></polyline>
            </svg>
        );
    }

    if (tick === "delivered") {
        return (
            <svg
                className="tick tick--delivered"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
            >
                <polyline points="20 6 9 17 4 12"></polyline>
                <polyline points="20 10 13 17 8 12"></polyline>
            </svg>
        );
    }

    return (
        <svg
            className="tick tick--sent"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
        >
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    );
}
