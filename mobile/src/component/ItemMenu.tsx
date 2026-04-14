import { DrawerItem } from "@react-navigation/drawer"
import Icon from 'react-native-vector-icons/Entypo';
import SCREEN_NAME from "../share"
import { theme } from "../theme/colors";
import { StyleSheet } from "react-native";


type ItemMenuProps = {
    navigation: any,
    label: string,
    name_icon: string,
    screen_name: string,
    focused: string,
    onPress?: () => void
}

const ItemMenu = ({navigation, label, name_icon, screen_name, focused, onPress}: ItemMenuProps) => {
    return (
        <DrawerItem
            label={label}
            icon={() => <Icon name={name_icon} style={{color: focused === screen_name ? theme.colors.white : theme.colors.black}} size={24} />}
            onPress={onPress || (() => navigation.navigate(screen_name))}
            focused={focused === screen_name}
            activeBackgroundColor={theme.colors.primary}
            activeTintColor={theme.colors.white}
            style={styles.menuItem}
        />
    )
}

const styles = StyleSheet.create({
    menuItem: {
        marginHorizontal: 0,
        marginVertical: 0,
        padding: 0,
        borderRadius: 8,
    }
})
export default ItemMenu;
