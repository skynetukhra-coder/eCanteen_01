

function Menu() {
    const [selectedTime, setSelectedTime] = useState("12:30 PM");
    const { category } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        fetchMenu();
    }, [category]);

    const fetchMenu = async () => {
        try {
            const response = await axios.get(
                (window.API_BASE_URL || "http://localhost:5000") + `/api/menu/${category}`
            );

            const menuItems = response.data.map((item) => ({
                ...item,
                selectedQty: 0,
            }));

            setItems(menuItems);
        } catch (error) {
            console.error(error);
        }
    };

    const [items, setItems] = useState([]);

    const increaseQty = (id) => {
        setItems(
            items.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        selectedQty:
                            item.selectedQty < item.quantity
                                ? item.selectedQty + 1
                                : item.selectedQty,
                    }
                    : item
            )
        );
    };

    const decreaseQty = (id) => {
        setItems(
            items.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        selectedQty:
                            item.selectedQty > 0
                                ? item.selectedQty - 1
                                : 0,
                    }
                    : item
            )
        );
    };

    const totalPrice = items.reduce(
        (sum, item) =>
            sum + item.price * item.selectedQty,
        0
    );

    const totalItems = items.reduce(
        (sum, item) =>
            sum + item.selectedQty,
        0
    );

    const timeSlots = [
        "12:00 PM",
        "12:30 PM",
        "01:00 PM",
        "01:30 PM",
    ];

    return (
        <div className="menu-container">
            <div className="menu-header">
                <FaArrowLeft />

                <div>
                    <h2>
                        {category.charAt(0).toUpperCase() +
                            category.slice(1)}{" "}
                        Menu
                    </h2>
                    <p>Today's Available Items</p>
                </div>

                <FaBell />
            </div>

            {items.map((item) => (
                <div className="food-card" key={item.id}>
                    <img
                        src={`${window.API_BASE_URL || "http://localhost:5000"}${item.image_url}`}
                        alt={item.name}
                        className="food-image"
                    />

                    <div className="food-details">
                        <h3>{item.name}</h3>

                        <p>₹{item.price}</p>

                        <small>
                            Available: {item.quantity}
                        </small>
                    </div>

                    <div className="qty-box">
                        <button onClick={() => decreaseQty(item.id)}>
                            -
                        </button>

                        <span>{item.selectedQty}</span>

                        <button onClick={() => increaseQty(item.id)}>
                            +
                        </button>
                    </div>
                </div>
            ))}

            <div className="pickup-section">
                <h3>Select Pickup Time</h3>

                <div className="time-slots">
                    {timeSlots.map((time) => (
                        <button
                            key={time}
                            className={
                                selectedTime === time
                                    ? "time-btn active"
                                    : "time-btn"
                            }
                            onClick={() => setSelectedTime(time)}
                        >
                            {time}
                        </button>
                    ))}
                </div>
            </div>

            <div className="summary-card">
                <p>Total Items: {totalItems}</p>
                <h3>Total Amount: ₹{totalPrice}</h3>
            </div>

            <button
                className="pay-btn"
                onClick={() =>
                    navigate("/payment", {
                        state: {
                            cartItems: items.filter(
                                (item) => item.selectedQty > 0
                            ),
                            totalPrice,
                            selectedTime,
                        },
                    })
                }
            >
                Proceed To Pay ₹{totalPrice}
            </button>
        </div>
    );
}

export default Menu;