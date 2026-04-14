import { StyleSheet, Text, TextInput, View } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

type TextAreaCustomProps = {
    title: string;
    placeholder?: string;
    value?: string;
    onChangeText?: (text: string) => void;
    onBlur?: () => void;
    type?: 'default' | 'number';
}

const TextAreaCustom = ({ title, placeholder, value, onChangeText, onBlur, type = 'default' }: TextAreaCustomProps) => {
    return (
        <View style={styles.formContainer}>
            {title && <Text style={styles.titleInput}>{title}</Text>}
            <TextInput
                style={styles.textarea}
                multiline={true}
                numberOfLines={6}
                placeholder={placeholder}
                value={value}
                onChangeText={onChangeText}
                textAlignVertical="top"
                placeholderTextColor="#999"
                keyboardType={type === 'number' ? 'numeric' : 'default'}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    textarea: {
        width: '100%',
        height: hp('20%'),
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        color: '#333',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        padding: hp('1.5%'),
        marginTop: hp('1%'),
        fontSize: hp('1.8%'),
    },
    formContainer: {
        marginTop: hp('2%'),
    },
    titleInput: {
        fontSize: hp('1.8%'),
        fontWeight: 'bold',
        color: '#666',
        marginBottom: hp('0.5%'),
    },
})

export default TextAreaCustom;